import { Avatar } from '@mui/material'
import { getChannelLogoSrc } from '@/utils/channelHelpers'

interface ChannelLogoProps {
  channel?: string | null
  logo?: string | null
  size?: number
}

export function ChannelLogo({ channel, logo, size = 20 }: ChannelLogoProps) {
  const src = getChannelLogoSrc(channel, logo)

  return (
    <Avatar
      src={src}
      alt=""
      sx={{
        width: size,
        height: size,
        bgcolor: theme => (theme.palette.mode === 'dark' ? 'grey.800' : 'grey.100'),
        border: 1,
        borderColor: 'divider',
        '& img': { objectFit: 'cover' }
      }}
    />
  )
}
