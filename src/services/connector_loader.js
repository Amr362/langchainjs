import { tool } from "@langchain/core/tools";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const connectorsDir = path.join(__dirname, "../connectors");

/**
 * يقوم بتحميل الموصلات من مجلد connectors وتحويلها إلى أدوات LangChain.
 * @returns {Promise<Array>}
 */
export const loadConnectorsAsTools = async () => {
  const loadedTools = [];
  try {
    const files = await fs.readdir(connectorsDir);
    for (const file of files) {
      if (file.endsWith(".js") && file !== "index.js") { // تجاهل index.js وملفات غير JS
        const connectorPath = path.join(connectorsDir, file);
        const { default: ConnectorClass } = await import(connectorPath);
        
        // التأكد من أن الكلاس المستورد هو بالفعل موصل
        if (typeof ConnectorClass === "function" && ConnectorClass.prototype.execute) {
          const connectorInstance = new ConnectorClass();
          
          // تحويل الموصل إلى أداة LangChain
          const connectorTool = tool(
            async (input) => {
              try {
                return await connectorInstance.execute(input);
              } catch (error) {
                return `خطأ في تنفيذ الموصل ${connectorInstance.name}: ${error.message}`;
              }
            },
            {
              name: connectorInstance.name,
              description: connectorInstance.description,
              schema: connectorInstance.schema,
            }
          );
          loadedTools.push(connectorTool);
          console.log(`تم تحميل الموصل: ${connectorInstance.name}`);
        }
      }
    }
  } catch (error) {
    console.error("خطأ في تحميل الموصلات:", error);
  }
  return loadedTools;
};
