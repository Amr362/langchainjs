import Connector from "../connectors/index.js";
import { z } from "zod";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

class GitHubConnector extends Connector {
  constructor() {
    super({
      name: "github_repo_info",
      description: "يستخدم لجلب معلومات مستودع GitHub مثل الوصف، عدد النجوم، واللغة الأساسية.",
      schema: z.object({
        owner: z.string().describe("اسم مالك المستودع (المستخدم أو المنظمة)"),
        repo: z.string().describe("اسم المستودع"),
      }),
      invoke: async ({ owner, repo }) => {
        try {
          const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
            headers: {
              Authorization: `token ${process.env.GITHUB_TOKEN}`,
              Accept: "application/vnd.github.v3+json",
            },
          });

          if (!response.ok) {
            throw new Error(`فشل جلب معلومات المستودع: ${response.status} ${response.statusText}`);
          }

          const data = await response.json();
          return `معلومات المستودع ${owner}/${repo}:\nالوصف: ${data.description || "لا يوجد"}\nالنجوم: ${data.stargazers_count}\nاللغة الأساسية: ${data.language || "غير محدد"}\nرابط المستودع: ${data.html_url}`;
        } catch (error) {
          return `خطأ في موصل GitHub: ${error.message}`;
        }
      },
    });
  }
}

export default GitHubConnector;
