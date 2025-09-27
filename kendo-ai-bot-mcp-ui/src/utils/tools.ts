import { showGrid } from "./tools/showGrid";
import { showUserDetails } from "./tools/showUserDetails";

export default async function getTools() {
  try {
    return {
      showGrid,
      showUserDetails,
    };
  } catch (error) {
    console.error("Error fetching tools from MCP server:", error);
  }
}
