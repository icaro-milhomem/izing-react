import { Router } from 'express'
import { upload, uploadFile } from '../controllers/FileUploadController'

const router = Router()

router.post('/api/upload', upload.single('file'), uploadFile)

export default router 