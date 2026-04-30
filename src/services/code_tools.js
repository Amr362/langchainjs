import { tool } from "@langchain/core/tools";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, "../../");

// 1. أداة قراءة الملفات المحلية
export const readLocalFileTool = tool(
  async ({ filePath }) => {
    try {
      const absolutePath = path.resolve(PROJECT_ROOT, filePath);
      if (!absolutePath.startsWith(PROJECT_ROOT)) {
        return "خطأ: لا يمكن الوصول لملفات خارج نطاق المشروع.";
      }
      if (!fs.existsSync(absolutePath)) {
        return `خطأ: الملف ${filePath} غير موجود.`;
      }
      const content = fs.readFileSync(absolutePath, "utf-8");
      return content;
    } catch (error) {
      return `خطأ في قراءة الملف: ${error.message}`;
    }
  },
  {
    name: "code_read_file",
    description: "تستخدم لقراءة محتوى ملف محلي في المشروع.",
    schema: z.object({
      filePath: z.string().describe("المسار النسبي للملف المراد قراءته"),
    }),
  }
);

// 2. أداة كتابة/تعديل الملفات
export const writeFileTool = tool(
  async ({ filePath, content }) => {
    try {
      const absolutePath = path.resolve(PROJECT_ROOT, filePath);
      if (!absolutePath.startsWith(PROJECT_ROOT)) {
        return "خطأ: لا يمكن الكتابة في ملفات خارج نطاق المشروع.";
      }
      const dir = path.dirname(absolutePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(absolutePath, content, "utf-8");
      return `تم حفظ الملف بنجاح في: ${filePath}`;
    } catch (error) {
      return `خطأ في حفظ الملف: ${error.message}`;
    }
  },
  {
    name: "code_write_file",
    description: "تستخدم لإنشاء أو تعديل ملف محلي في المشروع.",
    schema: z.object({
      filePath: z.string().describe("المسار النسبي للملف"),
      content: z.string().describe("المحتوى الجديد للملف"),
    }),
  }
);

// 3. أداة تنفيذ أوامر الشل (Shell Commands)
export const executeCommandTool = tool(
  async ({ command }) => {
    try {
      // قائمة بالأوامر المحظورة لأسباب أمنية
      const forbiddenPatterns = [/rm -rf \//, /mkfs/, /: \(\)\{ :\|:& \}; :/];
      if (forbiddenPatterns.some(pattern => pattern.test(command))) {
        return "خطأ: الأمر يحتوي على أنماط محظورة أمنياً.";
      }

      const output = execSync(command, { cwd: PROJECT_ROOT, encoding: "utf-8", timeout: 30000 });
      return output || "تم تنفيذ الأمر بنجاح (لا يوجد مخرجات).";
    } catch (error) {
      return `خطأ في تنفيذ الأمر: ${error.message}\nالمخرجات: ${error.stderr || ""}`;
    }
  },
  {
    name: "code_execute_command",
    description: "تستخدم لتنفيذ أوامر الشل (مثل npm install, ls, git status) داخل المشروع.",
    schema: z.object({
      command: z.string().describe("الأمر المراد تنفيذه"),
    }),
  }
);

// 4. أداة سرد الملفات في مجلد
export const listFilesTool = tool(
  async ({ dirPath = "." }) => {
    try {
      const absolutePath = path.resolve(PROJECT_ROOT, dirPath);
      if (!absolutePath.startsWith(PROJECT_ROOT)) {
        return "خطأ: لا يمكن الوصول لمجلدات خارج نطاق المشروع.";
      }
      const files = fs.readdirSync(absolutePath);
      return files.join("\n");
    } catch (error) {
      return `خطأ في سرد الملفات: ${error.message}`;
    }
  },
  {
    name: "code_list_files",
    description: "تستخدم لسرد الملفات والمجلدات في مسار معين.",
    schema: z.object({
      dirPath: z.string().optional().describe("المسار المراد سرده (افتراضياً المجلد الرئيسي)"),
    }),
  }
);

export const codeTools = [readLocalFileTool, writeFileTool, executeCommandTool, listFilesTool];
