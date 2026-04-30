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
  async ({ name, type, config }) => {
    try {
      const data = JSON.parse(fs.readFileSync(CONNECTORS_FILE, "utf-8"));
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
      config: z.record(z.any()).describe("إعدادات الموصل (مثل API Keys, URLs)"),
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
  async ({ connectorId, action, params }) => {
    try {
      const data = JSON.parse(fs.readFileSync(CONNECTORS_FILE, "utf-8"));
      const connector = data.connectors.find(c => c.id === connectorId);
      if (!connector) return `خطأ: الموصل ذو المعرف ${connectorId} غير موجود.`;
      
      // هنا يتم تنفيذ المنطق الفعلي للربط بناءً على النوع
      // حالياً سنقوم بمحاكاة التنفيذ
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
      params: z.record(z.any()).optional().describe("المعاملات الإضافية للإجراء"),
    }),
  }
);

export const connectorTools = [addConnectorTool, listConnectorsTool, invokeConnectorTool];
