import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    const openAIKey = process.env.OPENAI_API_KEY;

    if (!openAIKey) {
      console.warn("[Transcribe API] OpenAI API Key is missing. Falling back to client-side input recovery.");
      return NextResponse.json({ 
        error: "transcription-key-missing",
        message: "OpenAI API Key not configured. Please search manually.",
        text: ""
      }, { status: 200 }); // Return 200 so the client can handle the fallback status cleanly
    }

    // Call OpenAI Whisper API using axios
    const apiFormData = new FormData();
    apiFormData.append("file", file);
    apiFormData.append("model", "whisper-1");
    apiFormData.append("language", "en");

    console.log("[Transcribe API] Sending audio to OpenAI Whisper...");
    const whisperRes = await axios.post("https://api.openai.com/v1/audio/transcriptions", apiFormData, {
      headers: {
        Authorization: `Bearer ${openAIKey}`,
        "Content-Type": "multipart/form-data",
      },
    });

    const text = whisperRes.data?.text || "";
    console.log("[Transcribe API] Whisper Result:", text);

    return NextResponse.json({ text });
  } catch (error: any) {
    console.error("[Transcribe API] Exception caught:", error.message);
    return NextResponse.json({ 
      error: "transcription-failed", 
      message: error.message || "Failed to transcribe audio",
      text: ""
    }, { status: 200 });
  }
}
