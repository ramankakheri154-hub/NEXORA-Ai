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

    const { message, history = [] } = req.body || {};

    if (
      typeof message !== "string" ||
      !message.trim()
    ) {
      return res.status(400).json({
        error: "Please enter a valid message"
      });
    }

    if (!Array.isArray(history)) {
      return res.status(400).json({
        error: "Invalid conversation history"
      });
    }

    const safeHistory = history
      .slice(-12)
      .filter(item =>
        item &&
        ["user", "assistant"].includes(item.role) &&
        typeof item.content === "string"
      )
      .map(item => ({
        role: item.role,
        content: item.content.slice(0, 4000)
      }));

    const messages = [
      {
        role: "system",
        content: `
You are NEXORA AI, a friendly, intelligent and helpful AI assistant.

LANGUAGE:
- Detect the language of the user's latest message.
- Reply in exactly the same language.
- Hindi message = Hindi response.
- English message = English response.
- Hinglish message = natural Hinglish response.
- For other languages, reply in that language.
- Switch language only when requested.

CONVERSATION:
- Understand previous messages in the conversation.
- Remember relevant context from the supplied conversation history.
- Answer follow-up questions using previous context.
- Do not ask the user to repeat information already provided.

RESPONSE STYLE:
- Be natural, clear and friendly.
- Answer directly.
- Keep normal answers concise, usually 1-4 sentences.
- Avoid unnecessary headings and tables.
- Give detailed answers when requested.
- Never output raw JSON or role labels.
- You are NEXORA AI, not ChatGPT.
- Be honest when uncertain.
        `
      },
      ...safeHistory,
      {
        role: "user",
        content: message.trim().slice(0, 4000)
      }
    ];

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
          messages,
          temperature: 0.6,
          max_tokens: 1000
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(502).json({
        error: data.error?.message || "AI provider request failed"
      });
    }

    const reply = data.choices?.[0]?.message?.content;

    if (!reply || typeof reply !== "string") {
      return res.status(502).json({
        error: "AI returned an empty response"
      });
    }

    return res.status(200).json({
      reply: reply.trim()
    });

  } catch (error) {
    console.error("NEXORA API Error:", error);

    return res.status(500).json({
      error: "Something went wrong. Please try again."
    });
  }
};
