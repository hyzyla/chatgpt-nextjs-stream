import {
  createParser,
  type ParsedEvent,
  type ReconnectInterval,
} from "eventsource-parser";
import { env } from "~/env.mjs";

export type ChatGPTAgent = "user" | "system" | "assistant";

export const config = {
  runtime: "edge",
};

export interface ChatGPTMessage {
  role: ChatGPTAgent;
  content: string;
}

const handler = async (): Promise<Response> => {
  // Prepare messages
  const messages: ChatGPTMessage[] = [
    {
      role: "user",
      content:
        "Tell me 10 jokes about programming and software development, include one or two jokes about AI. Also don't use numbers to numberate jokes, use emoji related to programming or development instead, each item should have unique emoji somehow related to a joke.",
    },
  ];

  // Make request to OpenAI
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    method: "POST",
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: messages,
      temperature: 0.7,
      max_tokens: 4000,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      stream: true,
      n: 1,
    }),
  });

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let counter = 0;

  // Create a stream for the response
  const stream = new ReadableStream({
    async start(controller) {
      // stream response (SSE) from OpenAI may be fragmented into multiple chunks
      // this ensures we properly read chunks and invoke an event for each SSE event stream
      const parser = createParser((event: ParsedEvent | ReconnectInterval) => {
        if (event.type === "event") {
          const data = event.data;
          // https://beta.openai.com/docs/api-reference/completions/create#completions/create-stream
          if (data === "[DONE]") {
            console.log("DONE");
            controller.close();
            return;
          }

          try {
            const json = JSON.parse(data) as {
              choices: {
                delta?: {
                  content: string;
                };
              }[];
            };
            const text = json.choices[0]?.delta?.content || "";
            if (counter < 2 && (text.match(/\n/) || []).length) {
              // this is a prefix character (i.e., "\n\n"), do nothing
              return;
            }
            const queue = encoder.encode(text);
            controller.enqueue(queue);
            counter++;
          } catch (e) {
            // maybe parse error
            controller.error(e);
          }
        }
      });

      for await (const chunk of res.body as any) {
        parser.feed(decoder.decode(chunk as BufferSource));
      }
    },
  });

  return new Response(stream);
};

export default handler;
