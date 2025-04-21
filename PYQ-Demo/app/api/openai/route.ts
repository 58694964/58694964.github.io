import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources';

// 初始化OpenAI客户端
const openai = new OpenAI({
  apiKey: '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',
});

export async function POST(request: Request) {
  try {
    const { prompt, image } = await request.json();

    if (!prompt && !image) {
      return NextResponse.json(
        { error: '请提供文本提示或图片' },
        { status: 400 }
      );
    }

    console.log('收到请求，图片数据类型:', typeof image);
    
    // 检查图片数据是否为base64格式
    if (image && !image.startsWith('data:image/')) {
      return NextResponse.json(
        { error: '无效的图片格式，请确保图片为base64格式' },
        { status: 400 }
      );
    }

    // 准备消息内容
    let messages: ChatCompletionMessageParam[] = [];
    
    if (prompt) {
      messages = [
        {
          role: 'user',
          content: prompt
        }
      ];
    } else if (image) {
      messages = [
        {
          role: 'user',
          content: [
            { 
              type: 'text', 
              text: '请详细描述这张图片中的内容，包括可能的场景、人物、物体等。用中文回答。' 
            },
            { 
              type: 'image_url', 
              image_url: { 
                url: image,
                detail: 'auto'
              } 
            }
          ]
        } as ChatCompletionMessageParam
      ];
    }

    console.log('准备调用OpenAI API...');

    // 调用OpenAI API
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messages,
      max_tokens: 1000,
    });

    console.log('OpenAI API调用成功');

    return NextResponse.json({ result: response.choices[0].message.content });
  } catch (error: any) {
    console.error('OpenAI API调用错误:', error);
    
    // 提供更详细的错误信息
    let errorMessage = '处理请求时出错';
    if (error.message) {
      errorMessage = `错误详情: ${error.message}`;
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
