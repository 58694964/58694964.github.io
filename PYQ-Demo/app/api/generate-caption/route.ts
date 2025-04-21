import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources';

// 初始化OpenAI客户端
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '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',
});

export async function POST(request: Request) {
  try {
    const { images, platform, style, location, useLocation } = await request.json();

    if (!images || images.length === 0) {
      return NextResponse.json(
        { error: '请提供至少一张图片' },
        { status: 400 }
      );
    }

    console.log('收到请求，图片数量:', images.length);
    console.log('平台:', platform, '风格:', style);
    console.log('位置信息:', useLocation ? location : '未使用位置');
    
    // 准备系统提示
    const systemPrompt = `你是一个专业的社交媒体文案撰写专家，擅长为${
      platform === 'xiaohongshu' ? '小红书' :
      platform === 'weibo' ? '微博' :
      platform === 'wechat' ? '朋友圈' : '抖音'
    }平台创作吸引人的文案。
    
    请根据用户提供的图片内容，生成一段${
      style === 'healing' ? '治愈' :
      style === 'humorous' ? '幽默' :
      style === 'contrast' ? '反差' :
      style === 'elegant' ? '优雅' : '日常'
    }风格的文案。

    ${useLocation && location ? `请在文案中自然地融入位置信息："${location}"` : ''}
    
    针对${platform}平台的要求：
    - ${platform === 'xiaohongshu' ? '使用多个emoji，分段清晰，文案要有共鸣感，加入2-3个相关话题标签' : ''}
    - ${platform === 'weibo' ? '语言简洁有力，可以使用一些网络流行语，加入1-2个话题标签' : ''}
    - ${platform === 'wechat' ? '文案简短，情感真实，不需要标签，少用emoji' : ''}
    - ${platform === 'douyin' ? '文案节奏感强，简短有力，加入1-2个热门标签' : ''}
    
    请确保文案的长度适中，风格统一，并与图片内容紧密相关。`;

    // 准备用户提示
    let userPrompt = `我上传了${images.length}张图片，请为我生成一段适合${
      platform === 'xiaohongshu' ? '小红书' :
      platform === 'weibo' ? '微博' :
      platform === 'wechat' ? '朋友圈' : '抖音'
    }平台的${
      style === 'healing' ? '治愈' :
      style === 'humorous' ? '幽默' :
      style === 'contrast' ? '反差' :
      style === 'elegant' ? '优雅' : '日常'
    }风格文案。`;
    
    if (useLocation && location) {
      userPrompt += `\n位置是：${location}`;
    }
    
    userPrompt += `\n图片按顺序排列，请根据图片内容和顺序生成连贯的文案。`;

    // 处理图片URL
    const processedImages = images.map((imageUrl: string, index: number) => {
      try {
        // 确保图片URL是有效的
        if (!imageUrl.startsWith('data:image/')) {
          console.warn(`图片 #${index + 1} URL格式不正确，可能导致API调用失败`);
        }
        
        return {
          type: 'image_url',
          image_url: {
            url: imageUrl,
            detail: 'low' // 使用低细节模式减少token消耗
          }
        };
      } catch (error) {
        console.error(`处理图片 #${index + 1} 时出错:`, error);
        throw new Error(`处理图片 #${index + 1} 失败`);
      }
    });

    // 准备消息内容
    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: userPrompt },
          ...processedImages
        ] as any
      }
    ];

    console.log('准备调用OpenAI API...');

    // 调用OpenAI API
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messages,
      max_tokens: 1000,
      temperature: 0.7, // 增加一些创造性
    });

    console.log('OpenAI API调用成功');

    // 返回生成的文案
    return NextResponse.json({ 
      caption: response.choices[0].message.content,
      usage: response.usage // 返回token使用情况，便于调试
    });
  } catch (error: any) {
    console.error('OpenAI API调用错误:', error);
    
    // 提供更详细的错误信息
    let errorMessage = '处理请求时出错';
    let statusCode = 500;
    
    if (error.message) {
      errorMessage = `错误详情: ${error.message}`;
      
      // 检查是否是OpenAI API特定错误
      if (error.response) {
        const { status, data } = error.response;
        statusCode = status;
        errorMessage = `OpenAI API错误 (${status}): ${data?.error?.message || '未知错误'}`;
        
        // 针对常见错误提供更友好的消息
        if (status === 400) {
          errorMessage = '图片格式不正确或无法处理，请尝试使用不同的图片';
        } else if (status === 401) {
          errorMessage = 'API密钥无效或已过期';
        } else if (status === 429) {
          errorMessage = 'API请求次数超限，请稍后再试';
        } else if (status === 500) {
          errorMessage = 'OpenAI服务器错误，请稍后再试';
        }
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}
