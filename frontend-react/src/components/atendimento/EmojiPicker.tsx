import { useState } from 'react'
import { Box, IconButton, Popover } from '@mui/material'
import { Smile } from 'lucide-react'
import { ActionIconButton } from '@/components/icons/ActionIconButton'
import { ICON_SIZE, ICON_STROKE } from '@/components/icons/iconStyles'

const EMOJIS = [
  '😀', '😁', '😂', '🤣', '😊', '😍', '😘', '😎', '🙂', '😉',
  '😢', '😭', '😡', '😱', '👍', '👎', '🙏', '👏', '🤝', '💪',
  '❤️', '💙', '💚', '🔥', '⭐', '✅', '❌', '❓', '❗', '🎉',
  '📎', '📷', '🎵', '☎️', '📍', '💬', '🕐', '💰', '🚀', '✨'
]

interface EmojiPickerProps {
  disabled?: boolean
  onPick: (emoji: string) => void
}

export function EmojiPicker({ disabled, onPick }: EmojiPickerProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)

  return (
    <>
      <ActionIconButton
        title="Inserir emoji"
        disabled={disabled}
        active={Boolean(anchor)}
        onClick={e => setAnchor(e.currentTarget)}
      >
        <Smile size={ICON_SIZE} strokeWidth={ICON_STROKE} />
      </ActionIconButton>
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 0.5, p: 1, maxWidth: 280 }}>
          {EMOJIS.map(emoji => (
            <IconButton
              key={emoji}
              onClick={() => {
                onPick(emoji)
                setAnchor(null)
              }}
              sx={{ fontSize: '1.25rem' }}
            >
              {emoji}
            </IconButton>
          ))}
        </Box>
      </Popover>
    </>
  )
}
