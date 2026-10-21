"""Serve HEIF originals as browser-compatible JPEG without changing source files."""
import hashlib
import logging
import os
import tempfile
from pathlib import Path

import anyio
from PIL import Image, ImageOps
from pillow_heif import register_heif_opener
from starlette.responses import FileResponse
from starlette.staticfiles import StaticFiles

register_heif_opener()
LOGGER = logging.getLogger(__name__)


def browser_image(source: Path, cache_dir: Path) -> Path:
    cache_dir.mkdir(parents=True, exist_ok=True)
    key = hashlib.sha256(f'{source.name}:{source.stat().st_mtime_ns}'.encode()).hexdigest()
    target = cache_dir / f'{key}.jpg'
    if target.exists():
        return target
    with Image.open(source) as original:
        rendered = ImageOps.exif_transpose(original).convert('RGB')
        # Keep the original untouched; cap only the web presentation size.
        rendered.thumbnail((3840, 3840))
        with tempfile.NamedTemporaryFile(dir=cache_dir, suffix='.jpg', delete=False) as temporary:
            temporary_path = Path(temporary.name)
        try:
            rendered.save(temporary_path, format='JPEG', quality=92, optimize=True)
            os.replace(temporary_path, target)
        finally:
            temporary_path.unlink(missing_ok=True)
    return target


class PhotographyFiles(StaticFiles):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.conversion_limiter = None

    async def get_response(self, path, scope):
        response = await super().get_response(path, scope)
        if response.status_code != 200:
            return response
        full_path, stat_result = self.lookup_path(path)
        if not stat_result or not Path(full_path).is_file():
            return response
        with open(full_path, 'rb') as file:
            signature = file.read(32)
        if signature[4:8] != b'ftyp' or not any(brand in signature for brand in (b'heic', b'heix', b'hevc', b'hevx', b'mif1')):
            return response
        try:
            if self.conversion_limiter is None:
                self.conversion_limiter = anyio.CapacityLimiter(1)
            converted = await anyio.to_thread.run_sync(
                browser_image, Path(full_path), Path(self.directory) / '.browser-cache',
                limiter=self.conversion_limiter,
            )
            return FileResponse(converted, media_type='image/jpeg', method=scope['method'])
        except Exception:
            LOGGER.exception('Could not create web rendition for %s', path)
            return response
