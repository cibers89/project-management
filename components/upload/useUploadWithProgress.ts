'use client'

import { useState } from 'react'
import imageCompression from 'browser-image-compression'

export type UploadItem = {
  id: string
  file: File
  preview?: string
  caption: string
}

export type ProgressMap = Record<string, number>
export type StatusMap = Record<string, 'processing' | 'ready'>

type Options = {
  enableImageCompression?: boolean
}

export function useUploadWithProgress(
  options: Options = { enableImageCompression: false }
) {
  const [items, setItems] = useState<UploadItem[]>([])
  const [progress, setProgress] = useState<ProgressMap>({})
  const [status, setStatus] = useState<StatusMap>({})

  /**
   * =========================
   * INTERNAL: SIMULATED PROGRESS
   * =========================
   */
  const simulateProgress = (id: string) => {
    let value = 0
    setStatus(prev => ({ ...prev, [id]: 'processing' }))

    const interval = setInterval(() => {
      value += 10
      setProgress(prev => ({ ...prev, [id]: value }))

      if (value >= 100) {
        clearInterval(interval)
        setStatus(prev => ({ ...prev, [id]: 'ready' }))
      }
    }, 80)
  }

  /**
   * =========================
   * ADD FILES
   * =========================
   */
  const addFiles = async (fileList: FileList | null) => {
    if (!fileList) return

    for (const originalFile of Array.from(fileList)) {
      const id = crypto.randomUUID()
      simulateProgress(id)

      let finalFile = originalFile

      // IMAGE COMPRESSION (OPTIONAL)
      if (
        options.enableImageCompression &&
        originalFile.type.startsWith('image/')
      ) {
        finalFile = await imageCompression(originalFile, {
          maxWidthOrHeight: 1600,
          initialQuality: 0.75,
          useWebWorker: true,
        })
      }

      const preview = finalFile.type.startsWith('image/')
        ? URL.createObjectURL(finalFile)
        : undefined

      setItems(prev => [
        ...prev,
        {
          id,
          file: finalFile,
          preview,
          caption: '',
        },
      ])
    }
  }

  /**
   * =========================
   * UPDATE CAPTION
   * =========================
   */
  const updateCaption = (id: string, caption: string) => {
    setItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, caption } : item
      )
    )
  }

  /**
   * =========================
   * REMOVE ITEM
   * =========================
   */
  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id))

    setProgress(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })

    setStatus(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  /**
   * =========================
   * DERIVED STATE
   * =========================
   */
  const allReady = Object.values(status).every(v => v === 'ready')

  /**
   * =========================
   * RESET
   * =========================
   */
  const reset = () => {
    setItems([])
    setProgress({})
    setStatus({})
  }

  return {
    items,
    progress,
    status,
    allReady,
    addFiles,
    updateCaption,
    removeItem,
    reset,
  }
}
