'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface DeleteMemoryDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  memoryTitle: string
  memoryType: 'response' | 'entry'
  isDeleting?: boolean
}

export default function DeleteMemoryDialog({
  open,
  onClose,
  onConfirm,
  memoryTitle,
  memoryType,
  isDeleting = false
}: DeleteMemoryDialogProps) {
  const typeLabel = memoryType === 'response' ? 'response' : 'life entry'
  const icon = memoryType === 'response' ? '💭' : '📖'

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogContent className="bg-gradient-to-br from-white to-comfort-50">
        <DialogHeader>
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-red-50 to-red-100 rounded-full">
            <div className="text-2xl">⚠️</div>
          </div>
          <DialogTitle className="text-xl font-gentle text-center">
            Delete This Memory Forever?
          </DialogTitle>
          <DialogDescription className="text-center leading-relaxed">
            You&apos;re about to permanently delete this precious {typeLabel}. This action cannot be undone, 
            and this memory will be lost forever.
          </DialogDescription>
        </DialogHeader>

        {/* Memory Preview */}
        <div className="bg-white rounded-embrace border border-peace-200 p-4 my-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{icon}</span>
            <span className="text-sm font-medium text-peace-600 capitalize">
              {typeLabel}
            </span>
          </div>
          <h3 className="font-compassionate text-peace-800 text-sm leading-relaxed line-clamp-2">
            {memoryTitle}
          </h3>
        </div>

        {/* Warning Message */}
        <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-embrace p-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="text-red-500 text-lg mt-0.5">🔒</div>
            <div>
              <h4 className="font-gentle text-red-800 text-sm font-medium mb-1">
                This deletion is permanent
              </h4>
              <p className="text-xs text-red-700 leading-relaxed font-supportive">
                Once deleted, this {typeLabel} cannot be recovered. All associated training data 
                and connections will also be removed from your digital legacy.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
            className="border-peace-300 text-peace-700 hover:bg-peace-50"
          >
            Keep Safe
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg"
          >
            {isDeleting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Deleting...
              </div>
            ) : (
              'Delete Forever'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}