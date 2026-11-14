module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "GROQ_API_KEY is missing in Vercel"
      });
    }

    const { message } = req.body || {};

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        error: "Please enter a valid message"
      });
    }

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",

        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          model: "openai/gpt-oss-20b",

          messages: [
            {
              role: "system",
              content: `
You are NEXORA AI, a professional, intelligent and friendly AI assistant.

RESPONSE STYLE:
- Give natural, human-like answers.
- Reply in the same language as the user.
- Keep normal answers short and direct, usually 1-4 sentences.
- Answer the actual question first.
- Avoid unnecessary headings, tables and long lists.
- Give clear opinions when asked, with a brief reason.
- Provide detailed explanations only when requested.
- Use simple language and helpful examples when needed.
- Never output raw JSON or role labels.
- Never say you are ChatGPT. You are NEXORA AI.
- Be accurate. If you are unsure, say so honestly.

Your goal is to make every conversation feel natural, useful and intelligent.
              `
            },

            {
              role: "user",
              content: message.trim()
            }
          ],

          temperature: 0.6,
          max_tokens: 700
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(502).json({
        error: data.error?.message || "AI provider request failed",
        status: response.status
      });
    }

    let reply = data.choices?.[0]?.message?.content;

    if (!reply) {
      return res.status(502).json({
        error: "AI returned an empty response"
      });
    }

    // Clean JSON-style responses if the model returns them.
    if (typeof reply === "string") {
      const cleaned = reply.trim();

      try {
        const parsed = JSON.parse(cleaned);

        if (
          parsed &&
          typeof parsed === "object" &&
          typeof parsed.content === "string"
        ) {
          reply = parsed.content;
        }
      } catch {
        reply = cleaned;
      }
    }

    return res.status(200).json({
      reply: String(reply).trim()
    });

  } catch (error) {
    console.error("NEXORA API Error:", error);

    return res.status(500).json({
      error: "Something went wrong. Please try again."
    });
  }
};
