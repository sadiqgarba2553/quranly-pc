# Local audio conversion engine

Quranly uses FFmpeg as a separate local process to create optional 64 and 128 kbps MP3 copies of downloaded recitations. Original recordings are unchanged when Original is selected. Conversion does not improve source fidelity and requires downloading the original recording first.

The Windows binary is distributed through ffmpeg-static 5.3.0, using the FFmpeg 6.1.1 essentials build by Gyan. It is licensed under GPL version 3; license and build information are available from the following upstream sources:

- FFmpeg source: https://ffmpeg.org/releases/ffmpeg-6.1.1.tar.xz
- Windows build source/configuration: https://github.com/GyanD/codexffmpeg
- Binary distribution and license: https://github.com/eugeneware/ffmpeg-static/releases/tag/b6.1.1
- GPL version 3: https://www.gnu.org/licenses/gpl-3.0.html

No user recordings or recitations are sent to an encoding server. Recitation downloads use the MP3Quran catalog and recording servers: https://www.mp3quran.net/eng/api
