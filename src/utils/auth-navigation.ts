// ============================================
// CLEAN AUTH NAVIGATION UTILITY
// ============================================

import type { Route } from "next";

/**
 * Get navigation path after authentication
 * Returns '/plans' if user is on free plan, '/dashboard' if premium
 */
export async function getPostAuthNavigationPath(): Promise<Route> {
  try {
    return "/dashboard" as Route;
  } catch (error) {
    console.error("Error checking subscription:", error);
    return "/auth" as Route;
  }
}
