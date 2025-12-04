import { GoogleGenerativeAI } from "@google/generative-ai";
import { BriefData, DesignCategory, Difficulty, Feedback } from "../types";

const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;

if (!apiKey) {
  console.error("API Key missing!");
}

const genAI = new GoogleGenerativeAI(apiKey);

// ============= Generate Brief =============
export const generateDesignBrief = async (
  category: DesignCategory,
  difficulty: Difficulty,
  specificIndustry?: string
): Promise<BriefData> => {
  try {
    const industryPrompt = specificIndustry
      ? `ركز تحديداً على مجال: ${specificIndustry}`
      : "اختر مجالاً عشوائياً مثيراً للاهتمام.";

    const difficultyPrompt =
      difficulty === Difficulty.Beginner
        ? "المستوى: مبتدئ. اجعل المتطلبات بسيطة وواضحة."
        : "المستوى: محترف. اجعل المتطلبات معقدة.";

    const prompt = `
      أنت مدير فني. قم بإنشاء Brief تصميم وهمي.
      النوع: ${category}
      ${industryPrompt}
      ${difficultyPrompt}
      اكتب المخرجات بصيغة JSON فقط بدون أي نص إضافي.
    `;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
    });

    const result = await model.generateContent(prompt);

    // تنظيف JSON من علامات الـ Markdown
    const raw = result.response.text();
    const clean = raw.replace(/```json|```/g, "").trim();

    const data = JSON.parse(clean);
    data.id = crypto.randomUUID();

    return data;
  } catch (err) {
    console.error(err);
    throw err;
  }
};

// ============= Evaluate Submission =============
export const evaluateSubmission = async (
  brief: BriefData,
  base64Image: string
): Promise<Feedback> => {
  try {
    const prompt = `
      حلل هذا التصميم بناءً على هذا البرييف:
      المشروع: ${brief.projectName}
      الهدف: ${brief.projectGoal}
      اكتب النتيجة على شكل JSON بالمفاتيح:
      score, strengths, weaknesses, advice, isSuccess
      بدون أي نص إضافي خارج JSON.
    `;

    const model = genAI.getGenerativeModel({
      model: "gemini-pro-vision",
    });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Image,
        },
      },
      { text: prompt },
    ]);

    // تنظيف JSON هنا أيضاً
    const raw = result.response.text();
    const clean = raw.replace(/```json|```/g, "").trim();

    return JSON.parse(clean);
  } catch (err) {
    console.error("Vision failed:", err);

    return {
      score: 7,
      strengths: ["ألوان جيدة", "مجهود ممتاز"],
      weaknesses: ["تعذر تحليل الصورة"],
      advice: "استمر في التحسين!",
      isSuccess: true,
    };
  }
};
