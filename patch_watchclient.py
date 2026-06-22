import re

with open("src/app/watch/[type]/[id]/WatchClient.tsx", "r") as f:
    content = f.read()

# 1. Fix kw.name
content = content.replace("const k = kw.name.toLowerCase();", 'const k = kw?.name?.toLowerCase() || "";')

# 2. Fix activeServer.getUrl
old_embed = """    const embedUrl = isAnimeServer 
        ? (activeServer as any).getUrl(animeData?.aniListId || animeData?._id || id, selectedEpisode, tmdbIdForAnime)
        : activeServer.getUrl(resolvedMediaType, activeId, selectedSeason, selectedEpisode);"""

new_embed = """    const embedUrl = isAnimeServer 
        ? (activeServer as any)?.getUrl?.(animeData?.aniListId || animeData?._id || id, selectedEpisode, tmdbIdForAnime) || ""
        : activeServer?.getUrl?.(resolvedMediaType, activeId, selectedSeason, selectedEpisode) || "";"""
content = content.replace(old_embed, new_embed)

# 3. Add history dependency
content = content.replace("    }, [searchParams, id, type]);", "    }, [searchParams, id, type, history]);")

# 4. Remove dead code
content = re.sub(r"    const \[showServers, setShowServers\] = useState\(false\);\n", "", content)
content = re.sub(r"    const \[smartSwitchEnabled, setSmartSwitchEnabled\] = useState\(true\);\n", "", content)
content = re.sub(r"    const \[healthScores, setHealthScores\] = useState<Record<string, number>>\(\{\}\);\n", "", content)

# 5. Add fallbackTimeoutRef
old_timeout_hook = """    // Cleanup countdown timer on unmount
    useEffect(() => {
        return () => {
            if (nextIntervalRef.current) clearInterval(nextIntervalRef.current);
        };
    }, []);"""

new_timeout_hook = """    // Cleanup countdown timer on unmount
    const fallbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    useEffect(() => {
        return () => {
            if (nextIntervalRef.current) clearInterval(nextIntervalRef.current);
            if (fallbackTimeoutRef.current) clearTimeout(fallbackTimeoutRef.current);
        };
    }, []);"""
content = content.replace(old_timeout_hook, new_timeout_hook)

# 6. Use fallbackTimeoutRef
content = content.replace("setTimeout(() => setActiveServer(nextServer), 50);", "fallbackTimeoutRef.current = setTimeout(() => setActiveServer(nextServer), 50);")

with open("src/app/watch/[type]/[id]/WatchClient.tsx", "w") as f:
    f.write(content)
print("Minor patches applied.")
