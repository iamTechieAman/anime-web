/**
 * Clerk Metadata Helper Utilities
 * 
 * Handles user metadata synchronization with Clerk using the updated `user.updateMetadata` API,
 * eliminating deprecation warnings and providing fallback support for legacy SDKs.
 */

export interface UpdateMetadataOptions {
  unsafeMetadata?: Record<string, any>;
  publicMetadata?: Record<string, any>;
}

/**
 * Safely updates a Clerk user's metadata using the modern `user.updateMetadata` API.
 * Replaces deprecated `user.update({ unsafeMetadata })` calls.
 * 
 * @param user The Clerk User object (from useUser hook)
 * @param options Metadata update options (unsafeMetadata, publicMetadata)
 */
export async function updateClerkMetadata(
  user: any,
  options: UpdateMetadataOptions
): Promise<any> {
  if (!user) return;

  // Use the modern Clerk updateMetadata API if available
  if (typeof user.updateMetadata === "function") {
    return await user.updateMetadata(options);
  }

  // Fallback for legacy versions of the Clerk SDK
  if (typeof user.update === "function") {
    return await user.update(options);
  }

  throw new Error("Clerk User object does not support metadata update methods.");
}
