'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './Button';
import { ZoomIn, ZoomOut, RotateCw, Check, X } from 'lucide-react';

interface AvatarCropProps {
  imageSrc: string;
  onCropComplete: (croppedBlob: Blob) => void;
  onCancel: () => void;
  className?: string;
}

const CROPPER_SIZE = 280;
const OUTPUT_SIZE = 400;

export function AvatarCrop({ imageSrc, onCropComplete, onCancel, className }: AvatarCropProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [minScale, setMinScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  // 加载图片
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImage(img);
      // 计算最小缩放 - 确保图片能填满圆形区域
      const scaleX = CROPPER_SIZE / img.width;
      const scaleY = CROPPER_SIZE / img.height;
      const fitScale = Math.max(scaleX, scaleY);
      setMinScale(fitScale);
      setScale(fitScale);
      // 居中
      setOffset({
        x: (CROPPER_SIZE - img.width * fitScale) / 2,
        y: (CROPPER_SIZE - img.height * fitScale) / 2,
      });
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // 绘制预览
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = CROPPER_SIZE;
    canvas.height = CROPPER_SIZE;

    // 清空
    ctx.clearRect(0, 0, CROPPER_SIZE, CROPPER_SIZE);

    // 绘制圆形裁切区域
    ctx.save();
    ctx.beginPath();
    ctx.arc(CROPPER_SIZE / 2, CROPPER_SIZE / 2, CROPPER_SIZE / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // 绘制图片
    ctx.drawImage(
      image,
      offset.x,
      offset.y,
      image.width * scale,
      image.height * scale
    );

    ctx.restore();
  }, [image, scale, offset]);

  // 鼠标拖动
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - offset.x,
      y: e.clientY - offset.y,
    });
  }, [offset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 触摸拖动
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({
      x: touch.clientX - offset.x,
      y: touch.clientY - offset.y,
    });
  }, [offset]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    setOffset({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 滚轮缩放
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale((prev) => Math.min(Math.max(prev * delta, minScale * 0.5), 5));
  }, [minScale]);

  // 缩放按钮
  const handleZoomIn = useCallback(() => {
    setScale((prev) => Math.min(prev * 1.2, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((prev) => Math.max(prev / 1.2, minScale * 0.5));
  }, [minScale]);

  // 旋转
  const handleRotate = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360);
  }, []);

  // 生成裁切结果（应用旋转）
  const handleCropComplete = useCallback(async () => {
    if (!image) return;

    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 裁切区域对应源图的区域
    const srcCenterX = (CROPPER_SIZE / 2 - offset.x) / scale;
    const srcCenterY = (CROPPER_SIZE / 2 - offset.y) / scale;
    const srcRadius = (CROPPER_SIZE / 2) / scale;

    // 创建临时画布处理旋转
    if (rotation !== 0) {
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;

      tempCanvas.width = OUTPUT_SIZE;
      tempCanvas.height = OUTPUT_SIZE;

      // 旋转并绘制
      tempCtx.translate(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2);
      tempCtx.rotate((rotation * Math.PI) / 180);

      const srcSize = srcRadius * 2;
      tempCtx.drawImage(
        image,
        srcCenterX - srcRadius,
        srcCenterY - srcRadius,
        srcSize,
        srcSize,
        -OUTPUT_SIZE / 2,
        -OUTPUT_SIZE / 2,
        OUTPUT_SIZE,
        OUTPUT_SIZE
      );

      // 从临时画布裁切圆形
      ctx.beginPath();
      ctx.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(tempCanvas, 0, 0);
    } else {
      // 无旋转直接裁切
      ctx.beginPath();
      ctx.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      const srcSize = srcRadius * 2;
      ctx.drawImage(
        image,
        srcCenterX - srcRadius,
        srcCenterY - srcRadius,
        srcSize,
        srcSize,
        0,
        0,
        OUTPUT_SIZE,
        OUTPUT_SIZE
      );
    }

    // 转为 Blob
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.92);
    });

    if (blob) {
      onCropComplete(blob);
    }
  }, [image, offset, scale, rotation, onCropComplete]);

  // 缩放百分比
  const zoomPercent = Math.round((scale / minScale) * 100);

  if (!image) {
    return (
      <div className={cn('flex items-center justify-center', className)} style={{ height: CROPPER_SIZE }}>
        <p className="text-text-muted">加载图片中...</p>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col items-center', className)}>
      {/* 裁切预览区 */}
      <div
        ref={containerRef}
        className="relative rounded-full overflow-hidden cursor-grab select-none"
        style={{
          width: CROPPER_SIZE,
          height: CROPPER_SIZE,
          backgroundColor: '#0a0a0a',
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.65)',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0"
          style={{
            width: CROPPER_SIZE,
            height: CROPPER_SIZE,
            transform: `rotate(${rotation}deg)`,
          }}
        />
        {/* 圆形边框 */}
        <div className="absolute inset-0 rounded-full border-[3px] border-white/70 pointer-events-none" />
        {/* 十字准星 */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="w-6 h-[1px] bg-white/40" />
          <div className="w-[1px] h-6 bg-white/40 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* 工具栏 */}
      <div className="flex items-center gap-2 mt-6">
        {/* 缩放控制 */}
        <div className="flex items-center gap-1 px-2 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-xl">
          <button
            type="button"
            onClick={handleZoomOut}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300"
            title="缩小"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="w-12 text-center text-sm font-medium text-gray-600 dark:text-gray-300">
            {zoomPercent}%
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300"
            title="放大"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        {/* 旋转按钮 */}
        <button
          type="button"
          onClick={handleRotate}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300"
          title="旋转 90°"
        >
          <RotateCw className="w-4 h-4" />
        </button>
      </div>

      {/* 提示文字 */}
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
        拖动图片调整位置 · 滚轮缩放
      </p>

      {/* 操作按钮 */}
      <div className="flex items-center gap-3 mt-5">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
        >
          <X className="w-4 h-4" />
          取消
        </button>
        <button
          type="button"
          onClick={handleCropComplete}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#D36F2B] hover:bg-[#B85E22] rounded-xl transition-colors shadow-lg shadow-orange-500/25"
        >
          <Check className="w-4 h-4" />
          确认裁切
        </button>
      </div>
    </div>
  );
}
