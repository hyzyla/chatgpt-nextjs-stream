import { type ChatGPTMessage, OpenAIStream, type OpenAIStreamPayload } from "~/server/utils";

export const config = {
  runtime: "edge",
};

const handler = async (): Promise<Response> => {

  const messages: ChatGPTMessage[] = [
    {
      role: "system",
      content: "Generate response in Markdown format",
    },
    {
      role: "user",
      content: "Напиши 10 жартів про програмування, програмістів або ІТ",
    },
  ];

  const payload: OpenAIStreamPayload = {
    model: "gpt-3.5-turbo",
    messages: messages,
    temperature: 0.7,
    max_tokens: 4000,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
    stream: true,
    n: 1,
  };

  const stream = await OpenAIStream(payload);
  return new Response(stream);
};

export default handler;