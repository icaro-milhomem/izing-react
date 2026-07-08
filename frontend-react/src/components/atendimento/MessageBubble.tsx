import { useState } from 'react'
import {
  Box,
  Checkbox,
  IconButton,
  Menu,
  MenuItem,
  Typography
} from '@mui/material'
import ReplyIcon from '@mui/icons-material/Reply'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import ForwardIcon from '@mui/icons-material/Forward'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import ScheduleIcon from '@mui/icons-material/Schedule'
import DoneAllIcon from '@mui/icons-material/DoneAll'
import DoneIcon from '@mui/icons-material/Done'
import type { Message } from '@/types/entities'
import { canDeleteMessage, canEditMessage, canForwardMessage } from '@/utils/messageHelpers'
import { AudioMessage } from '@/components/atendimento/AudioMessage'
import { CallMessageMarker } from '@/components/atendimento/CallMessageMarker'
import { ImageLightbox } from '@/components/atendimento/ImageLightbox'
import { isAudioMediaType, resolveMediaUrl } from '@/utils/mediaUrl'
import { isCallMessage } from '@/utils/callHelpers'
import { bubbleRadius, getChatBubblePalette } from '@/utils/chatBubbleStyles'
import { formatMessageTime } from '@/utils/formatDate'
import { useBrandTokens } from '@/hooks/useBrandTokens'

function isPdf(url?: string, body?: string) {
  const target = (url || body || '').toLowerCase()
  return target.includes('.pdf') || target.endsWith('pdf')
}

function AckIcon({ ack, readColor, defaultColor }: { ack?: number; readColor: string; defaultColor: string }) {
  if (ack == null || ack < 1) return null
  const color = ack >= 3 ? readColor : defaultColor
  if (ack >= 3) return <DoneAllIcon sx={{ fontSize: 15, color }} />
  return <DoneIcon sx={{ fontSize: 15, color }} />
}

interface MessageBubbleProps {
  message: Message
  highlighted?: boolean
  multiForward?: boolean
  selected?: boolean
  onReply?: (message: Message) => void
  onEdit?: (message: Message) => void
  onDelete?: (message: Message) => void
  onForward?: (message: Message) => void
  onToggleForward?: (message: Message) => void
  onQuoteClick?: (message: Message) => void
}

export function MessageBubble({
  message,
  highlighted,
  multiForward,
  selected,
  onReply,
  onEdit,
  onDelete,
  onForward,
  onToggleForward,
  onQuoteClick
}: MessageBubbleProps) {
  const { colors, mode } = useBrandTokens()
  const palette = getChatBubblePalette(mode, colors)
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const type = message.mediaType || 'chat'
  const deleted = message.isDeleted
  const mediaSrc = resolveMediaUrl(message.mediaUrl)
  const showPdf = mediaSrc && isPdf(mediaSrc, message.body)
  const isAudio = isAudioMediaType(type)
  const isCall = isCallMessage(message)
  const isMedia = ['image', 'video'].includes(type) || showPdf
  const timeLabel = formatMessageTime(message.timestamp || message.createdAt)
  const fromMe = message.fromMe

  const bubbleBg = fromMe ? palette.outgoingBg : palette.incomingBg
  const bubbleText = fromMe ? palette.outgoingText : palette.incomingText

  const messageMeta = (
    <>
      {message.scheduleDate && (
        <ScheduleIcon sx={{ fontSize: 13, opacity: 0.75, color: palette.meta }} titleAccess="Agendada" />
      )}
      {message.edited && String(message.edited) !== 'false' && (
        <Typography component="span" variant="caption" sx={{ fontSize: 11, color: palette.meta }}>
          editada
        </Typography>
      )}
      {timeLabel && (
        <Typography component="span" variant="caption" sx={{ fontSize: 11, color: palette.meta, lineHeight: 1 }}>
          {timeLabel}
        </Typography>
      )}
      {fromMe && <AckIcon ack={message.ack} readColor={palette.ackRead} defaultColor={palette.meta} />}
    </>
  )

  const metaRow = (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 0.35,
        float: 'right',
        ml: 1.5,
        mt: 0.75,
        position: 'relative',
        top: 4,
        whiteSpace: 'nowrap'
      }}
    >
      {messageMeta}
    </Box>
  )

  return (
    <Box
      id={`chat-message-${message.id}`}
      sx={{
        alignSelf: fromMe ? 'flex-end' : 'flex-start',
        maxWidth: isAudio ? 360 : '72%',
        minWidth: isAudio ? 250 : undefined,
        position: 'relative',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 0.5,
        mb: 0.75,
        outline: highlighted ? '2px solid' : 'none',
        outlineColor: 'warning.main',
        borderRadius: 1,
        '&:hover .msg-actions': { opacity: 1 }
      }}
    >
      {multiForward && onToggleForward && !deleted && (
        <Checkbox size="small" checked={selected} onChange={() => onToggleForward(message)} sx={{ mt: 0.5 }} />
      )}

      <Box sx={{ flex: 1, minWidth: 0 }}>
        {!fromMe && message.contact?.name && (
          <Typography
            variant="caption"
            sx={{ fontWeight: 700, display: 'block', mb: 0.35, px: 0.75, color: palette.contactName, fontSize: 12.5 }}
          >
            {message.contact.name}
          </Typography>
        )}

        <Box sx={{ position: 'relative' }}>
          {!multiForward && !deleted && (
            <Box
              className="msg-actions"
              sx={{
                position: 'absolute',
                top: -8,
                right: fromMe ? 'auto' : -4,
                left: fromMe ? -4 : 'auto',
                opacity: 0,
                transition: 'opacity 0.15s',
                zIndex: 1,
                display: 'flex',
                gap: 0.25
              }}
            >
              {onReply && (
                <IconButton size="small" sx={{ bgcolor: 'background.paper', boxShadow: 1 }} onClick={() => onReply(message)} title="Responder">
                  <ReplyIcon fontSize="small" />
                </IconButton>
              )}
              <IconButton size="small" sx={{ bgcolor: 'background.paper', boxShadow: 1 }} onClick={e => setMenuAnchor(e.currentTarget)} title="Opções">
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </Box>
          )}

          <Box
            sx={{
              bgcolor: bubbleBg,
              color: bubbleText,
              px: isMedia ? 0.75 : isAudio ? 1.25 : 1.5,
              py: isMedia ? 0.75 : isAudio ? 1 : 0.75,
              borderRadius: bubbleRadius(fromMe),
              boxShadow: palette.shadow,
              wordBreak: 'break-word',
              opacity: deleted ? 0.65 : 1,
              ...(isAudio && { minWidth: 250, width: 'fit-content', maxWidth: '100%' })
            }}
          >
            {message.quotedMsg && (
              <Box
                sx={{
                  borderLeft: '3px solid',
                  borderColor: palette.quoteBar,
                  bgcolor: fromMe ? palette.quoteBgOutgoing : palette.quoteBgIncoming,
                  borderRadius: '6px',
                  px: 1,
                  py: 0.75,
                  mb: 0.75,
                  cursor: onQuoteClick ? 'pointer' : 'default'
                }}
                onClick={() => onQuoteClick?.(message.quotedMsg!)}
              >
                <Typography variant="caption" sx={{ fontWeight: 700, color: palette.quoteBar, display: 'block', mb: 0.25 }}>
                  {message.quotedMsg.fromMe ? 'Você' : message.quotedMsg.contact?.name || 'Contato'}
                </Typography>
                <Typography variant="body2" noWrap sx={{ fontSize: 13, opacity: 0.9 }}>
                  {message.quotedMsg.body?.slice(0, 120) || '(mídia)'}
                </Typography>
              </Box>
            )}

            {deleted ? (
              <Box sx={{ fontStyle: 'italic', fontSize: 14.2, lineHeight: '19px' }}>
                Mensagem apagada
                {metaRow}
              </Box>
            ) : isCall ? (
              <Box>
                <CallMessageMarker body={message.body} />
                {metaRow}
              </Box>
            ) : (
              <>
                {type === 'image' && mediaSrc && (
                  <Box
                    component="img"
                    src={mediaSrc}
                    alt="imagem"
                    sx={{ maxWidth: '100%', maxHeight: 320, borderRadius: '6px', mb: 0.5, cursor: 'pointer', display: 'block' }}
                    onClick={() => setLightboxOpen(true)}
                  />
                )}
                {type === 'video' && mediaSrc && (
                  <Box component="video" src={mediaSrc} controls sx={{ maxWidth: '100%', borderRadius: '6px', mb: 0.5, display: 'block' }} />
                )}
                {isAudio && message.mediaUrl && (
                  <AudioMessage
                    mediaUrl={message.mediaUrl}
                    fromMe={fromMe}
                    meta={
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.35 }}>
                        {messageMeta}
                      </Box>
                    }
                  />
                )}
                {(type === 'application' || type === 'document') && mediaSrc && !showPdf && (
                  <Typography
                    component="a"
                    href={mediaSrc}
                    target="_blank"
                    rel="noopener"
                    sx={{ display: 'block', mb: 0.5, color: 'inherit', fontSize: 14.2 }}
                  >
                    📎 {message.body || 'Documento'}
                    {metaRow}
                  </Typography>
                )}
                {showPdf && mediaSrc && (
                  <Box
                    component="iframe"
                    src={mediaSrc}
                    title="PDF"
                    sx={{ width: '100%', minWidth: 280, height: 360, border: 0, borderRadius: '6px', mb: 0.5, bgcolor: 'background.paper' }}
                  />
                )}
                {type === 'location' && mediaSrc && (
                  <Typography component="a" href={mediaSrc} target="_blank" rel="noopener" sx={{ display: 'block', mb: 0.5, color: 'inherit', fontSize: 14.2 }}>
                    📍 Localização
                    {metaRow}
                  </Typography>
                )}
                {type === 'vcard' && (
                  <Typography variant="body2" sx={{ mb: 0.5, fontSize: 14.2 }}>
                    👤 Contato
                    {metaRow}
                  </Typography>
                )}
                {(type === 'chat' || !['image', 'video', 'audio', 'ptt', 'voice', 'application', 'document', 'location', 'vcard'].includes(type)) && message.body && (
                  <Box sx={{ whiteSpace: 'pre-wrap', fontSize: 14.2, lineHeight: '19px' }}>
                    {message.body}
                    {metaRow}
                  </Box>
                )}
                {type !== 'chat' &&
                  !isAudio &&
                  message.body &&
                  !showPdf &&
                  message.body !== message.mediaUrl && (
                  <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.9, fontSize: 13 }}>
                    {message.body}
                  </Typography>
                )}
                {!isAudio && (isMedia || showPdf) && (
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.25 }}>
                    {messageMeta}
                  </Box>
                )}
              </>
            )}
          </Box>
        </Box>
      </Box>

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        {onReply && (
          <MenuItem onClick={() => { setMenuAnchor(null); onReply(message) }}>
            <ReplyIcon fontSize="small" sx={{ mr: 1 }} /> Responder
          </MenuItem>
        )}
        {onForward && canForwardMessage(message) && (
          <MenuItem onClick={() => { setMenuAnchor(null); onForward(message) }}>
            <ForwardIcon fontSize="small" sx={{ mr: 1 }} /> Encaminhar
          </MenuItem>
        )}
        {onEdit && canEditMessage(message) && (
          <MenuItem onClick={() => { setMenuAnchor(null); onEdit(message) }}>
            <EditIcon fontSize="small" sx={{ mr: 1 }} /> Editar
          </MenuItem>
        )}
        {onDelete && canDeleteMessage(message) && (
          <MenuItem onClick={() => { setMenuAnchor(null); onDelete(message) }}>
            <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Apagar
          </MenuItem>
        )}
      </Menu>

      {mediaSrc && type === 'image' && (
        <ImageLightbox open={lightboxOpen} src={mediaSrc} onClose={() => setLightboxOpen(false)} />
      )}
    </Box>
  )
}

export function MessageDateSeparator({ label }: { label: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', my: 1.5 }}>
      <Typography
        variant="caption"
        sx={{
          bgcolor: theme => (theme.palette.mode === 'dark' ? 'rgba(17, 27, 33, 0.85)' : 'rgba(255,255,255,0.92)'),
          color: theme => (theme.palette.mode === 'dark' ? '#8696a0' : '#54656f'),
          px: 1.5,
          py: 0.5,
          borderRadius: 2,
          fontWeight: 600,
          fontSize: 12,
          boxShadow: '0 1px 0.5px rgba(11, 20, 26, 0.13)'
        }}
      >
        {label}
      </Typography>
    </Box>
  )
}
