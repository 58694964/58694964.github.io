import EXIF from 'exif-js';

// 坐标格式转换：将度分秒格式转换为十进制度数
function convertDMSToDD(degrees: number, minutes: number, seconds: number, direction: string) {
  let dd = degrees + minutes / 60 + seconds / 3600;
  if (direction === 'S' || direction === 'W') {
    dd = dd * -1;
  }
  return dd;
}

// 从EXIF数据中提取GPS坐标
function getGPSCoordinates(exifData: any) {
  if (!exifData || !exifData.GPSLatitude || !exifData.GPSLongitude) {
    console.log('GPS数据不存在或不完整');
    return null;
  }

  try {
    console.log('原始GPS数据:', {
      lat: exifData.GPSLatitude,
      latRef: exifData.GPSLatitudeRef,
      lon: exifData.GPSLongitude,
      lonRef: exifData.GPSLongitudeRef
    });

    // 处理不同格式的GPS数据
    let latDegrees, latMinutes, latSeconds, latDirection;
    let lonDegrees, lonMinutes, lonSeconds, lonDirection;

    // 检查是否为分数格式
    if (exifData.GPSLatitude[0].numerator !== undefined) {
      latDegrees = exifData.GPSLatitude[0].numerator / exifData.GPSLatitude[0].denominator;
      latMinutes = exifData.GPSLatitude[1].numerator / exifData.GPSLatitude[1].denominator;
      latSeconds = exifData.GPSLatitude[2].numerator / exifData.GPSLatitude[2].denominator;
    } else {
      // 假设是数字数组
      latDegrees = exifData.GPSLatitude[0];
      latMinutes = exifData.GPSLatitude[1];
      latSeconds = exifData.GPSLatitude[2];
    }

    if (exifData.GPSLongitude[0].numerator !== undefined) {
      lonDegrees = exifData.GPSLongitude[0].numerator / exifData.GPSLongitude[0].denominator;
      lonMinutes = exifData.GPSLongitude[1].numerator / exifData.GPSLongitude[1].denominator;
      lonSeconds = exifData.GPSLongitude[2].numerator / exifData.GPSLongitude[2].denominator;
    } else {
      lonDegrees = exifData.GPSLongitude[0];
      lonMinutes = exifData.GPSLongitude[1];
      lonSeconds = exifData.GPSLongitude[2];
    }

    latDirection = exifData.GPSLatitudeRef || 'N';
    lonDirection = exifData.GPSLongitudeRef || 'E';

    const latitude = convertDMSToDD(latDegrees, latMinutes, latSeconds, latDirection);
    const longitude = convertDMSToDD(lonDegrees, lonMinutes, lonSeconds, lonDirection);

    console.log('转换后的坐标:', { latitude, longitude });
    return { latitude, longitude };
  } catch (error) {
    console.error('解析GPS坐标时出错:', error);
    return null;
  }
}

// 从图片中提取EXIF数据
export const extractExifData = (file: File): Promise<any> => {
  return new Promise((resolve, reject) => {
    try {
      console.log('开始提取EXIF数据，文件类型:', file.type);
      
      // 检查文件类型
      if (!file.type.startsWith('image/')) {
        console.warn('文件不是图片类型:', file.type);
        resolve(null);
        return;
      }
      
      EXIF.getData(file as any, function(this: any) {
        console.log('EXIF.getData完成');
        try {
          const allTags = EXIF.getAllTags(this);
          console.log('提取到的所有EXIF标签:', Object.keys(allTags).length ? '有数据' : '无数据');
          
          // 检查是否有GPS数据
          if (allTags.GPSLatitude) {
            console.log('检测到GPS数据');
          } else {
            console.log('未检测到GPS数据');
          }
          
          resolve(allTags);
        } catch (error) {
          console.error('提取EXIF标签时出错:', error);
          resolve(null);
        }
      });
    } catch (error) {
      console.error('调用EXIF.getData时出错:', error);
      reject(error);
    }
  });
};

// 从图片中提取位置信息
export const extractLocationFromImage = async (file: File): Promise<string | null> => {
  try {
    console.log('开始从图片提取位置信息...');
    const exifData = await extractExifData(file);
    
    // 检查是否有位置数据
    if (!exifData || !exifData.GPSLatitude || !exifData.GPSLongitude) {
      console.log('图片中没有GPS数据');
      return null;
    }
    
    const coordinates = getGPSCoordinates(exifData);
    if (!coordinates) {
      console.log('无法解析GPS坐标');
      return null;
    }
    
    // 使用坐标生成位置字符串
    const locationString = `${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`;
    console.log('提取到的位置信息:', locationString);
    
    // 在实际应用中，这里可以调用地理编码API获取具体位置名称
    // 例如：广州 · 太古汇
    // 但为了简化示例，我们返回一个模拟的位置名称
    const mockLocations = [
      '广州 · 太古汇',
      '上海 · 外滩',
      '北京 · 三里屯',
      '深圳 · 华侨城',
      '杭州 · 西湖'
    ];
    
    // 使用坐标的哈希值选择一个模拟位置
    const hash = Math.abs(coordinates.latitude * coordinates.longitude) % mockLocations.length;
    const mockLocation = mockLocations[Math.floor(hash)];
    
    console.log('模拟位置名称:', mockLocation);
    return mockLocation;
  } catch (error) {
    console.error('从图片提取位置信息失败:', error);
    return null;
  }
};
