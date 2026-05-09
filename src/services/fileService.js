/**
 * File Service — Supabase Storage + uploaded_files table + localStorage fallback
 * Keeps all existing helper functions (getFileExt, formatFileSize, etc.)
 */
import { v4 as uuid } from 'uuid';
import { supabase, isSupabase } from '../lib/supabaseClient';

// File type constants (unchanged)
export const DOCUMENT_TYPES = ['pdf', 'doc', 'docx'];
export const IMAGE_TYPES = ['jpg', 'jpeg', 'png', 'webp'];
export const AUDIO_TYPES = ['mp3', 'wav', 'm4a', 'aac'];
export const VIDEO_TYPES = ['mp4', 'mov', 'webm'];

export const DOCUMENT_ACCEPT = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.webp';
export const AUDIO_ACCEPT = '.mp3,.mp4,.wav,.m4a,.aac';
export const VIDEO_ACCEPT = '.mp4,.mov,.webm';
export const ALL_ACCEPT = `${DOCUMENT_ACCEPT},${AUDIO_ACCEPT},${VIDEO_ACCEPT}`;

export const TYPE_ICONS = {
  pdf: '📄', doc: '📝', docx: '📝',
  jpg: '🖼️', jpeg: '🖼️', png: '🖼️', webp: '🖼️',
  mp3: '🎵', wav: '🎵', m4a: '🎵', aac: '🎵',
  mp4: '🎬', mov: '🎬', webm: '🎬',
  link: '🔗',
};

export function getFileExt(name) {
  return (name || '').split('.').pop().toLowerCase();
}
export function getFileIcon(name) {
  return TYPE_ICONS[getFileExt(name)] || '📎';
}
export function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}
export function isImageFile(name) { return IMAGE_TYPES.includes(getFileExt(name)); }
export function isAudioFile(name) { return AUDIO_TYPES.includes(getFileExt(name)); }
export function isVideoFile(name) { return VIDEO_TYPES.includes(getFileExt(name)); }
export function isDocumentFile(name) { return DOCUMENT_TYPES.includes(getFileExt(name)); }

export function canPreview(file) {
  if (file.download_url || file.downloadUrl) return ['pdf', 'jpg', 'jpeg', 'png', 'webp'].includes(file.type || getFileExt(file.name || file.file_name));
  return file.dataUrl && ['pdf', 'jpg', 'jpeg', 'png', 'webp'].includes(file.type || getFileExt(file.name));
}

/**
 * Convert File to metadata with base64 (localStorage mode)
 */
export function fileToMeta(file) {
  return new Promise((resolve) => {
    const meta = {
      id: uuid(), name: file.name, size: file.size,
      type: getFileExt(file.name), mime: file.type,
      uploadedAt: new Date().toISOString(),
    };
    const reader = new FileReader();
    reader.onload = () => { meta.dataUrl = reader.result; resolve(meta); };
    reader.onerror = () => { meta.dataUrl = ''; resolve(meta); };
    reader.readAsDataURL(file);
  });
}

/**
 * Upload file to Supabase Storage + save metadata to uploaded_files
 */
export async function uploadToSupabase(file, { classId, sessionId, uploadedBy, category }) {
  if (!isSupabase()) return fileToMeta(file);

  const bucket = category === 'listening' ? 'listening-files' : 'lesson-files';
  const ext = getFileExt(file.name);
  const storagePath = `${classId}/${sessionId}/${uuid()}.${ext}`;

  const { error: uploadErr } = await supabase.storage.from(bucket).upload(storagePath, file);
  if (uploadErr) throw uploadErr;

  // Get URL
  let downloadUrl = '';
  if (['avatars', 'class-images'].includes(bucket)) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);
    downloadUrl = data.publicUrl;
  } else {
    const { data } = await supabase.storage.from(bucket).createSignedUrl(storagePath, 3600);
    downloadUrl = data?.signedUrl || '';
  }

  // Insert metadata row
  const row = {
    class_id: classId, session_id: sessionId, uploaded_by: uploadedBy,
    file_name: file.name, file_type: ext, file_size: file.size,
    category, bucket_name: bucket, storage_path: storagePath,
    download_url: downloadUrl,
  };
  const { data: inserted, error: dbErr } = await supabase.from('uploaded_files').insert(row).select().single();
  if (dbErr) throw dbErr;

  return mapUploadedFile(inserted);
}

/**
 * Upload avatar to Supabase Storage
 */
export async function uploadAvatar(file, userId) {
  if (!isSupabase()) return fileToMeta(file);
  const ext = getFileExt(file.name);
  const path = `${userId}/avatar.${ext}`;
  await supabase.storage.from('avatars').upload(path, file, { upsert: true });
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Get files by session from Supabase
 */
export async function getFilesBySession(sessionId, category) {
  if (!isSupabase()) return [];
  let q = supabase.from('uploaded_files').select('*').eq('session_id', sessionId);
  if (category) q = q.eq('category', category);
  const { data } = await q.order('created_at');
  return (data || []).map(mapUploadedFile);
}

/**
 * Delete file from Supabase Storage + uploaded_files
 */
export async function deleteSupabaseFile(fileId) {
  if (!isSupabase()) return;
  const { data: file } = await supabase.from('uploaded_files').select('*').eq('id', fileId).single();
  if (!file) return;
  await supabase.storage.from(file.bucket_name).remove([file.storage_path]);
  await supabase.from('uploaded_files').delete().eq('id', fileId);
}

/**
 * Get fresh signed URL for private file
 */
export async function getSignedUrl(bucket, path, expiresIn = 3600) {
  if (!isSupabase()) return '';
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  return data?.signedUrl || '';
}

/**
 * Download file — works with both Supabase and localStorage
 */
export function downloadFile(file, toast) {
  try {
    const url = file.download_url || file.downloadUrl || file.dataUrl;
    if (!url) { toast?.('Không thể tải file này', 'error'); return; }
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name || file.file_name || 'download';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast?.('Đã tải file thành công');
  } catch {
    toast?.('Không thể tải file này', 'error');
  }
}

export function filterFilesByCategory(files, category) {
  if (!files) return [];
  switch (category) {
    case 'document': return files.filter(f => isDocumentFile(f.name || f.file_name) || isImageFile(f.name || f.file_name));
    case 'audio': return files.filter(f => isAudioFile(f.name || f.file_name));
    case 'video': return files.filter(f => isVideoFile(f.name || f.file_name));
    default: return files;
  }
}

export function validateFiles(fileList, acceptedExtensions) {
  const exts = acceptedExtensions.split(',').map(e => e.replace('.', '').toLowerCase());
  return Array.from(fileList).filter(f => exts.includes(getFileExt(f.name)));
}

/** Map Supabase uploaded_files row to app format */
function mapUploadedFile(f) {
  return {
    id: f.id,
    name: f.file_name,
    size: f.file_size,
    type: f.file_type,
    mime: '',
    category: f.category,
    bucketName: f.bucket_name,
    storagePath: f.storage_path,
    downloadUrl: f.download_url,
    dataUrl: f.download_url, // compat with existing components
    uploadedAt: f.created_at,
  };
}

const fileService = {
  getFileExt, getFileIcon, formatFileSize,
  isImageFile, isAudioFile, isVideoFile, isDocumentFile,
  canPreview, fileToMeta, downloadFile, filterFilesByCategory, validateFiles,
  uploadToSupabase, uploadAvatar, getFilesBySession, deleteSupabaseFile, getSignedUrl,
  DOCUMENT_ACCEPT, AUDIO_ACCEPT, VIDEO_ACCEPT, ALL_ACCEPT, TYPE_ICONS,
};

export default fileService;
