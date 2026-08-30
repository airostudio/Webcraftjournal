import type { APIRoute } from 'astro';
import { buildPost, writePost, CATEGORIES, IngestError, type Category } from '@/lib/ingest';

// This endpoint reads and writes local files, so it must run on the server —
// it is excluded from the static build output.
export const prerender = false;

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_EXTENSIONS = ['.docx', '.md', '.mdx'];

function checkPassword(submitted: FormDataEntryValue | null): string | null {
  const expected = import.meta.env.ADMIN_UPLOAD_PASSWORD;
  if (!expected) {
    return 'ADMIN_UPLOAD_PASSWORD is not set on the server. Add it to your .env file before using the admin page.';
  }
  if (!submitted || submitted !== expected) {
    return 'Incorrect password.';
  }
  return null;
}

export const POST: APIRoute = async ({ request }) => {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: 'Expected multipart/form-data.' }, { status: 400 });
  }

  const passwordError = checkPassword(formData.get('password'));
  if (passwordError) {
    return Response.json({ error: passwordError }, { status: 401 });
  }

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: 'No file was uploaded.' }, { status: 400 });
  }

  if (file.size > MAX_FILE_BYTES) {
    return Response.json({ error: 'File is too large (10 MB limit).' }, { status: 400 });
  }

  const ext = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`;
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return Response.json(
      { error: `Unsupported file type "${ext}". Expected .docx, .md, or .mdx.` },
      { status: 400 }
    );
  }

  const category = formData.get('category') as string | null;
  if (!category || !CATEGORIES.includes(category as Category)) {
    return Response.json(
      { error: `Category must be one of: ${CATEGORIES.join(', ')}` },
      { status: 400 }
    );
  }

  const tags = ((formData.get('tags') as string) ?? '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
  const author = (formData.get('author') as string) || undefined;
  const overwrite = formData.get('overwrite') === 'true';

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await buildPost({
      filename: file.name,
      buffer,
      category: category as Category,
      tags,
      author,
    });

    await writePost(result, { force: overwrite });

    return Response.json({
      ok: true,
      slug: result.slug,
      title: result.title,
      category: result.category,
      path: `/blog/${result.slug}/`,
    });
  } catch (error) {
    if (error instanceof IngestError) {
      return Response.json({ error: error.message }, { status: 409 });
    }
    console.error('Admin upload failed:', error);
    return Response.json({ error: 'Something went wrong while processing the file.' }, { status: 500 });
  }
};
