"use client";

/**
 * usePanelResize Hook
 * 
 * Handles resizable panel drag logic for left, right, and bottom panels.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { PANEL_SIZES } from "../utils/constants";

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface PanelResizeState {
  leftWidth: number;
  rightWidth: number;
  bottomHeight: number;
  isResizingLeft: boolean;
  isResizingRight: boolean;
  isResizingBottom: boolean;
}

interface UsePanelResizeOptions {
  /** Container ref for calculating bounds */
  containerRef: React.RefObject<HTMLDivElement>;
  /** Whether left panel is open */
  isLeftPanelOpen: boolean;
  /** Whether right panel is open */
  isRightPanelOpen: boolean;
  /** Whether bottom panel is open */
  isBottomPanelOpen: boolean;
  /** Callback when left panel closes */
  onLeftPanelClose?: () => void;
  /** Callback when right panel closes */
  onRightPanelClose?: () => void;
  /** Callback when bottom panel closes */
  onBottomPanelClose?: () => void;
}

interface UsePanelResizeReturn {
  /** Current panel sizes */
  leftWidth: number;
  rightWidth: number;
  bottomHeight: number;
  /** Whether currently resizing */
  isResizingLeft: boolean;
  isResizingRight: boolean;
  isResizingBottom: boolean;
  /** Setters for panel sizes */
  setLeftWidth: (width: number) => void;
  setRightWidth: (width: number) => void;
  setBottomHeight: (height: number) => void;
  /** Start resize handlers */
  startResizeLeft: (e: React.MouseEvent) => void;
  startResizeRight: (e: React.MouseEvent) => void;
  startResizeBottom: (e: React.MouseEvent) => void;
}

// Close threshold for panels
const CLOSE_THRESHOLD = 50;

// ═══════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════

export function usePanelResize({
  containerRef,
  isLeftPanelOpen,
  isRightPanelOpen,
  isBottomPanelOpen,
  onLeftPanelClose,
  onRightPanelClose,
  onBottomPanelClose,
}: UsePanelResizeOptions): UsePanelResizeReturn {
  const [leftWidth, setLeftWidth] = useState(PANEL_SIZES.left.default);
  const [rightWidth, setRightWidth] = useState(PANEL_SIZES.right.default);
  const [bottomHeight, setBottomHeight] = useState(PANEL_SIZES.bottom.default);
  
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const [isResizingBottom, setIsResizingBottom] = useState(false);

  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const startWidthRef = useRef(0);
  const startHeightRef = useRef(0);

  // Calculate max widths based on container
  const getMaxLeftWidth = useCallback(() => {
    if (!containerRef.current) return PANEL_SIZES.left.max;
    const containerWidth = containerRef.current.offsetWidth;
    const rightPanelWidth = isRightPanelOpen ? rightWidth : 0;
    const usedWidth = PANEL_SIZES.toolbar * 2 + rightPanelWidth + PANEL_SIZES.minEditor;
    return Math.min(PANEL_SIZES.left.max, containerWidth - usedWidth);
  }, [containerRef, isRightPanelOpen, rightWidth]);

  const getMaxRightWidth = useCallback(() => {
    if (!containerRef.current) return PANEL_SIZES.right.max;
    const containerWidth = containerRef.current.offsetWidth;
    const leftPanelWidth = isLeftPanelOpen ? leftWidth : 0;
    const usedWidth = PANEL_SIZES.toolbar * 2 + leftPanelWidth + PANEL_SIZES.minEditor;
    return Math.min(PANEL_SIZES.right.max, containerWidth - usedWidth);
  }, [containerRef, isLeftPanelOpen, leftWidth]);

  // Start resize handlers
  const startResizeLeft = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingLeft(true);
    startXRef.current = e.clientX;
    startWidthRef.current = leftWidth;
  }, [leftWidth]);

  const startResizeRight = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingRight(true);
    startXRef.current = e.clientX;
    startWidthRef.current = rightWidth;
  }, [rightWidth]);

  const startResizeBottom = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingBottom(true);
    startYRef.current = e.clientY;
    startHeightRef.current = bottomHeight;
  }, [bottomHeight]);

  // Handle mouse move during resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingLeft) {
        const delta = e.clientX - startXRef.current;
        const newWidth = startWidthRef.current + delta;
        
        if (newWidth < CLOSE_THRESHOLD) {
          setIsResizingLeft(false);
          onLeftPanelClose?.();
        } else {
          const maxWidth = getMaxLeftWidth();
          setLeftWidth(Math.max(PANEL_SIZES.left.min, Math.min(maxWidth, newWidth)));
        }
      }

      if (isResizingRight) {
        const delta = startXRef.current - e.clientX;
        const newWidth = startWidthRef.current + delta;
        
        if (newWidth < CLOSE_THRESHOLD) {
          setIsResizingRight(false);
          onRightPanelClose?.();
        } else {
          const maxWidth = getMaxRightWidth();
          setRightWidth(Math.max(PANEL_SIZES.right.min, Math.min(maxWidth, newWidth)));
        }
      }

      if (isResizingBottom) {
        const delta = startYRef.current - e.clientY;
        const newHeight = startHeightRef.current + delta;
        
        if (newHeight < CLOSE_THRESHOLD) {
          setIsResizingBottom(false);
          onBottomPanelClose?.();
        } else {
          setBottomHeight(Math.max(PANEL_SIZES.bottom.min, Math.min(PANEL_SIZES.bottom.max, newHeight)));
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizingLeft(false);
      setIsResizingRight(false);
      setIsResizingBottom(false);
    };

    if (isResizingLeft || isResizingRight || isResizingBottom) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = isResizingBottom ? "row-resize" : "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [
    isResizingLeft,
    isResizingRight,
    isResizingBottom,
    getMaxLeftWidth,
    getMaxRightWidth,
    onLeftPanelClose,
    onRightPanelClose,
    onBottomPanelClose,
  ]);

  return {
    leftWidth,
    rightWidth,
    bottomHeight,
    isResizingLeft,
    isResizingRight,
    isResizingBottom,
    setLeftWidth,
    setRightWidth,
    setBottomHeight,
    startResizeLeft,
    startResizeRight,
    startResizeBottom,
  };
}

export default usePanelResize;

