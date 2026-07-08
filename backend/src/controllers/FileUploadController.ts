import { Request, Response } from 'express'
import multer from 'multer'
import path from 'path'

// Configuração do multer para salvar arquivos em backend/uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.resolve(__dirname, '../../uploads'))
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + '-' + file.originalname)
  }
})

export const upload = multer({ storage })

export const uploadFile = (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado.' })
  }
  // Monta a URL pública do arquivo
  const fileUrl = `/uploads/${req.file.filename}`
  res.json({ url: fileUrl, name: req.file.originalname, type: req.file.mimetype })
} 