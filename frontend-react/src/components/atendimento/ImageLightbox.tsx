import { Dialog, DialogContent, IconButton } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'

interface ImageLightboxProps {
  open: boolean
  src: string
  onClose: () => void
}

export function ImageLightbox({ open, src, onClose }: ImageLightboxProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8, zIndex: 1, bgcolor: 'background.paper' }}>
        <CloseIcon />
      </IconButton>
      <DialogContent sx={{ p: 1, display: 'flex', justifyContent: 'center' }}>
        <img src={src} alt="Imagem" style={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain' }} />
      </DialogContent>
    </Dialog>
  )
}
