import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Box, Typography } from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import SettingsIcon from '@mui/icons-material/Settings'
import ChatIcon from '@mui/icons-material/Chat'

function BaseNode({
  label,
  color,
  icon,
  readonly
}: {
  label: string
  color: string
  icon: React.ReactNode
  readonly?: boolean
}) {
  return (
    <Box
      sx={{
        minWidth: 140,
        px: 2,
        py: 1.5,
        borderRadius: 2,
        bgcolor: color,
        color: '#fff',
        border: readonly ? '2px dashed rgba(255,255,255,0.5)' : '2px solid transparent',
        boxShadow: 2
      }}
    >
      {!readonly && <Handle type="target" position={Position.Top} />}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {icon}
        <Typography variant="body2" sx={{ fontWeight: 700 }}>{label}</Typography>
      </Box>
      <Handle type="source" position={Position.Bottom} />
    </Box>
  )
}

export const StartNode = memo(({ data }: NodeProps) => (
  <BaseNode label={String(data.label)} color="#374151" icon={<PlayArrowIcon fontSize="small" />} readonly />
))

export const ConfigNode = memo(({ data }: NodeProps) => (
  <BaseNode label={String(data.label)} color="#6366f1" icon={<SettingsIcon fontSize="small" />} readonly />
))

export const StepNode = memo(({ data }: NodeProps) => (
  <BaseNode label={String(data.label)} color="#2563eb" icon={<ChatIcon fontSize="small" />} />
))

export const flowNodeTypes = {
  start: StartNode,
  configurations: ConfigNode,
  node: StepNode,
  exception: StepNode
}
