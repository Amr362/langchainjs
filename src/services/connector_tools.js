import { tool } from "@langchain/core/tools";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONNECTORS_FILE = path.join(__dirname, "../../data/connectors.json");

// التأكد من وجود مجلد البيانات
const dataDir = path.dirname(CONNECTORS_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(CONNECTORS_FILE)) {
  fs.writeFileSync(CONNECTORS_FILE, JSON.stringify({ connectors: [] }, null, 2));
}

// 1. أداة إضافة موصل جديد
export const addConnectorTool = tool(
  async ({ name, type, config_json }) => {
    try {
      const data = JSON.parse(fs.readFileSync(CONNECTORS_FILE, "utf-8"));
      let config = {};
      try {
        config = typeof config_json === 'string' ? JSON.parse(config_json) : config_json;
      } catch (e) {
        return "خطأ: تنسيق الإعدادات (config_json) يجب أن يكون JSON صالحاً.";
      }

      const newConnector = {
        id: Date.now().toString(),
        name,
        type,
        config,
        createdAt: new Date().toISOString(),
        status: "enabled"
      };
      data.connectors.push(newConnector);
      fs.writeFileSync(CONNECTORS_FILE, JSON.stringify(data, null, 2));
      return `تمت إضافة الموصل "${name}" بنجاح.`;
    } catch (error) {
      return `خطأ في إضافة الموصل: ${error.message}`;
    }
  },
  {
    name: "connector_add",
    description: "تستخدم لإضافة موصل (Connector) جديد لربط تطبيق خارجي (مثل GitHub, Slack, API).",
    schema: z.object({
      name: z.string().describe("اسم الموصل"),
      type: z.string().describe("نوع الموصل (مثلاً: github, custom_api, slack)"),
      config_json: z.string().describe("إعدادات الموصل بصيغة JSON string (مثل API Keys, URLs)"),
    }),
  }
);

// 2. أداة سرد الموصلات المتاحة
export const listConnectorsTool = tool(
  async () => {
    try {
      const data = JSON.parse(fs.readFileSync(CONNECTORS_FILE, "utf-8"));
      if (data.connectors.length === 0) return "لا توجد موصلات مضافة حالياً.";
      return data.connectors.map(c => `- [${c.id}] ${c.name} (${c.type}) - الحالة: ${c.status}`).join("\n");
    } catch (error) {
      return `خطأ في جلب الموصلات: ${error.message}`;
    }
  },
  {
    name: "connector_list",
    description: "تستخدم لسرد كافة الموصلات والتطبيقات المربوطة حالياً.",
    schema: z.object({}),
  }
);

// 3. أداة استدعاء موصل (محاكاة لربط التطبيقات)
export const invokeConnectorTool = tool(
  async ({ connectorId, action, params_json }) => {
    try {
      const data = JSON.parse(fs.readFileSync(CONNECTORS_FILE, "utf-8"));
      const connector = data.connectors.find(c => c.id === connectorId);
      if (!connector) return `خطأ: الموصل ذو المعرف ${connectorId} غير موجود.`;
      
      let params = {};
      if (params_json) {
        try {
          params = typeof params_json === 'string' ? JSON.parse(params_json) : params_json;
        } catch (e) {
          return "خطأ: تنسيق المعاملات (params_json) يجب أن يكون JSON صالحاً.";
        }
      }

      // هنا يتم تنفيذ المنطق الفعلي للربط بناءً على النوع
      return `تم تنفيذ الإجراء "${action}" عبر الموصل "${connector.name}" بنجاح. المعاملات: ${JSON.stringify(params)}`;
    } catch (error) {
      return `خطأ في استدعاء الموصل: ${error.message}`;
    }
  },
  {
    name: "connector_invoke",
    description: "تستخدم لتنفيذ إجراء معين عبر موصل مربوط مسبقاً.",
    schema: z.object({
      connectorId: z.string().describe("معرف الموصل"),
      action: z.string().describe("الإجراء المراد تنفيذه"),
      params_json: z.string().optional().describe("المعاملات الإضافية للإجراء بصيغة JSON string"),
    }),
  }
);

export const connectorTools = [addConnectorTool, listConnectorsTool, invokeConnectorTool];
