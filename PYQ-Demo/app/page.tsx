'use client';

import { useState, useRef, useEffect } from 'react';
import { extractLocationFromImage } from '../utils/exifUtils';
import Image from 'next/image';

// 类型定义
type PlatformType = 'xiaohongshu' | 'weibo' | 'wechat' | 'douyin';
type StyleType = 'casual' | 'healing' | 'humorous' | 'contrast' | 'elegant';

interface ImageItem {
  id: string;
  url: string;
  order: number;
  file?: File; // 添加原始文件引用，用于提取EXIF数据
  location?: string | null; // 修改位置信息字段类型
}

export default function Home() {
  // 状态管理
  const [selectedImages, setSelectedImages] = useState<ImageItem[]>([]);
  const [platform, setPlatform] = useState<PlatformType>('xiaohongshu');
  const [style, setStyle] = useState<StyleType>('casual');
  const [generating, setGenerating] = useState<boolean>(false);
  const [caption, setCaption] = useState<string | null>(null);
  const [useLocation, setUseLocation] = useState<boolean>(true);
  const [location, setLocation] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 处理图片选择
  const handleImageSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // 处理文件选择变化
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // 显示加载提示
    console.log(`正在处理 ${files.length} 张图片...`);
    
    // 创建新图片数组
    const newImagesPromises = Array.from(files).map(async (file, index) => {
      // 尝试从图片中提取位置信息
      let locationFromImage = null;
      try {
        console.log(`正在从图片 ${index + 1} 提取EXIF数据...`);
        locationFromImage = await extractLocationFromImage(file);
        
        if (locationFromImage) {
          console.log(`成功从图片 ${index + 1} 中提取到位置信息:`, locationFromImage);
          
          // 如果是第一张图片且有位置信息，自动设置位置
          if (index === 0 && selectedImages.length === 0) {
            console.log('自动设置位置信息:', locationFromImage);
            setLocation(locationFromImage);
            setUseLocation(true);
          }
        } else {
          console.log(`图片 ${index + 1} 中没有位置信息`);
        }
      } catch (error) {
        console.error(`提取图片 ${index + 1} 位置信息失败:`, error);
      }

      // 创建图片对象
      return {
        id: `img-${Date.now()}-${index}`,
        file: file, // 保存原始文件引用
        url: URL.createObjectURL(file),
        order: selectedImages.length + index,
        location: locationFromImage // 保存提取到的位置信息
      };
    });

    try {
      const newImages = await Promise.all(newImagesPromises);
      console.log('所有图片处理完成，图片数据:', newImages);
      
      // 检查是否有位置信息
      const hasLocationInfo = newImages.some(img => img.location);
      console.log('是否从图片中提取到位置信息:', hasLocationInfo);
      
      setSelectedImages([...selectedImages, ...newImages]);
      setCaption(null); // 清除之前的文案
    } catch (error) {
      console.error('处理图片时出错:', error);
      alert('处理图片时出错，请重试');
    }

    // 重置文件输入，允许再次选择相同的文件
    if (event.target) {
      event.target.value = '';
    }
  };

  // 移除图片
  const removeImage = (id: string) => {
    const updatedImages = selectedImages.filter(img => img.id !== id);
    // 重新排序
    updatedImages.forEach((img, index) => {
      img.order = index;
    });
    setSelectedImages(updatedImages);
    setCaption(null); // 清除之前的文案
  };

  // 调整图片顺序
  const moveImage = (id: string, direction: 'up' | 'down') => {
    const index = selectedImages.findIndex(img => img.id === id);
    if (index === -1) return;

    const newImages = [...selectedImages];

    if (direction === 'up' && index > 0) {
      // 向上移动
      [newImages[index].order, newImages[index - 1].order] =
        [newImages[index - 1].order, newImages[index].order];

      [newImages[index], newImages[index - 1]] =
        [newImages[index - 1], newImages[index]];
    } else if (direction === 'down' && index < newImages.length - 1) {
      // 向下移动
      [newImages[index].order, newImages[index + 1].order] =
        [newImages[index + 1].order, newImages[index].order];

      [newImages[index], newImages[index + 1]] =
        [newImages[index + 1], newImages[index]];
    }

    setSelectedImages(newImages);
    setCaption(null); // 清除之前的文案
  };

  // 生成文案
  const generateCaption = async () => {
    if (selectedImages.length === 0) {
      alert('请至少选择一张图片');
      return;
    }

    setGenerating(true);

    try {
      // 确定使用的位置信息
      let locationInfo = null;
      
      // 如果用户启用了位置
      if (useLocation) {
        // 如果用户手动输入了位置，优先使用手动输入
        if (location) {
          locationInfo = location;
        } 
        // 否则尝试从图片中获取位置
        else {
          // 查找第一张有位置信息的图片
          for (const image of selectedImages) {
            if (image.location) {
              locationInfo = image.location;
              console.log('使用图片中的位置信息:', locationInfo);
              break;
            }
          }
        }
      }

      console.log('最终使用的位置信息:', locationInfo);

      // 将图片转换为base64格式
      const imageBase64Array = await Promise.all(
        selectedImages.map(async (image, index) => {
          console.log(`处理图片 ${index + 1}/${selectedImages.length}`);
          
          // 如果已经是base64格式，直接返回
          if (image.url.startsWith('data:image')) {
            return image.url;
          }
          
          // 否则，将blob URL转换为base64
          try {
            const response = await fetch(image.url);
            if (!response.ok) {
              throw new Error(`获取图片失败: ${response.status}`);
            }
            
            const blob = await response.blob();
            return await blobToBase64(blob);
          } catch (error) {
            console.error(`转换图片 ${index + 1} 格式失败:`, error);
            throw new Error(`图片 ${index + 1} 处理失败，请重新选择图片`);
          }
        })
      );

      console.log(`成功处理 ${imageBase64Array.length} 张图片`);

      // 调用OpenAI API生成文案
      console.log('正在调用API生成文案...');
      const response = await fetch('/api/generate-caption', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          images: imageBase64Array,
          platform,
          style,
          location: locationInfo,
          useLocation: !!locationInfo, // 只有当实际有位置信息时才启用
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '生成文案失败');
      }

      const data = await response.json();
      console.log('文案生成成功');
      setCaption(data.caption);
    } catch (error) {
      console.error('生成文案时出错:', error);
      alert('生成文案失败，请重试: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setGenerating(false);
    }
  };

  // 将Blob转换为base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // 复制文案到剪贴板
  const copyCaption = () => {
    if (!caption) return;

    navigator.clipboard.writeText(caption)
      .then(() => {
        alert('文案已复制到剪贴板');
      })
      .catch(err => {
        console.error('复制失败:', err);
        alert('复制失败，请手动复制');
      });
  };

  // 清理URL对象，防止内存泄漏
  useEffect(() => {
    return () => {
      selectedImages.forEach(img => {
        URL.revokeObjectURL(img.url);
      });
    };
  }, [selectedImages]);

  // 平台选择按钮渲染
  const renderPlatformButtons = () => {
    const platforms: { id: PlatformType, name: string }[] = [
      { id: 'xiaohongshu', name: '小红书' },
      { id: 'weibo', name: '微博' },
      { id: 'wechat', name: '朋友圈' },
      { id: 'douyin', name: '抖音' }
    ];

    return (
      <div className="platform-selector">
        <h3>选择平台</h3>
        <div className="button-group">
          {platforms.map(plat => (
            <button
              key={plat.id}
              className={`platform-btn ${platform === plat.id ? 'active' : ''}`}
              onClick={() => setPlatform(plat.id)}
            >
              {plat.name}
            </button>
          ))}
        </div>
      </div>
    );
  };

  // 风格选择按钮渲染
  const renderStyleButtons = () => {
    const styles: { id: StyleType, name: string }[] = [
      { id: 'casual', name: '日常' },
      { id: 'healing', name: '治愈' },
      { id: 'humorous', name: '幽默' },
      { id: 'contrast', name: '反差' },
      { id: 'elegant', name: '优雅' }
    ];

    return (
      <div className="style-selector">
        <h3>选择风格</h3>
        <div className="button-group">
          {styles.map(st => (
            <button
              key={st.id}
              className={`style-btn ${style === st.id ? 'active' : ''}`}
              onClick={() => setStyle(st.id)}
            >
              {st.name}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="social-caption-generator">
      <header>
        <h1>AI社交文案生成器</h1>
        <p>上传照片，一键生成社交平台文案</p>
      </header>

      <main>
        {/* 图片选择和排序区域 */}
        <section className="image-section">
          <h2>选择并排序照片</h2>
          <p className="tip">照片顺序将影响文案生成结果</p>

          <div className="image-grid">
            {selectedImages.map((img) => (
              <div key={img.id} className="image-item">
                <div className="image-order">{img.order + 1}</div>
                <img src={img.url} alt={`照片 ${img.order + 1}`} />
                <div className="image-controls">
                  <button
                    onClick={() => moveImage(img.id, 'up')}
                    disabled={img.order === 0}
                    className="control-btn"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => removeImage(img.id)}
                    className="control-btn remove"
                  >
                    ×
                  </button>
                  <button
                    onClick={() => moveImage(img.id, 'down')}
                    disabled={img.order === selectedImages.length - 1}
                    className="control-btn"
                  >
                    ↓
                  </button>
                </div>
              </div>
            ))}

            <div className="add-image-container" onClick={handleImageSelect}>
              <div className="add-image-btn">+</div>
              <p>添加照片</p>
            </div>
          </div>

          <input
            type="file"
            accept="image/*"
            multiple
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </section>

        {/* 平台和风格选择 */}
        <section className="options-section">
          {renderPlatformButtons()}
          {renderStyleButtons()}

          <div className="location-option">
            <h3>位置信息</h3>
            <div className="location-input-group">
              <label className="switch">
                <input
                  type="checkbox" 
                  checked={useLocation}
                  onChange={() => setUseLocation(!useLocation)}
                />
                <span className="slider round"></span>
              </label>
              <span>添加位置信息</span>
            </div>

            {useLocation && (
              <div className="location-input-container">
                <input
                  type="text"
                  placeholder="输入位置，如：广州 · 太古汇"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="location-input"
                />
                <p className="location-tip">
                  {selectedImages.some(img => img.location) 
                    ? '已从照片中提取位置信息，您也可以手动修改' 
                    : '未能从照片中提取位置信息，请手动输入'}
                </p>
              </div>
            )}
          </div>

          <button
            className="generate-btn"
            onClick={generateCaption}
            disabled={generating || selectedImages.length === 0}
          >
            {generating ? '生成中...' : '生成文案'}
          </button>
        </section>

        {/* 文案结果区域 */}
        {caption && (
          <section className="result-section">
            <h2>生成的文案</h2>
            <div className="caption-container">
              <pre className="caption-text">{caption}</pre>
              <button className="copy-btn" onClick={copyCaption}>
                复制文案
              </button>
            </div>

            <div className="preview-title">
              <h3>预览效果</h3>
              <p>平台: {
                platform === 'xiaohongshu' ? '小红书' :
                  platform === 'weibo' ? '微博' :
                    platform === 'wechat' ? '朋友圈' : '抖音'
              }</p>
            </div>

            <div className={`preview-container ${platform}`}>
              <div className="preview-header">
                <div className="preview-avatar"></div>
                <div className="preview-user">
                  <div className="preview-username">用户名</div>
                  {platform === 'xiaohongshu' && location && (
                    <div className="preview-location"> {location}</div>
                  )}
                </div>
              </div>

              <div className="preview-images">
                {selectedImages.slice(0, 4).map((img) => (
                  <div key={img.id} className="preview-image">
                    <img src={img.url} alt={`预览 ${img.order + 1}`} />
                  </div>
                ))}
                {selectedImages.length > 4 && (
                  <div className="preview-more">+{selectedImages.length - 4}</div>
                )}
              </div>

              <div className="preview-caption">
                {caption.split('\n').map((line, i) => (
                  <p key={i}>{line || ' '}</p>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <footer>
        <p> 2025 AI - </p>
      </footer>
    </div>
  );
}
