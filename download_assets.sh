#!/bin/bash
# ============================================================
# Скрипт скачивания ассетов с satvasamui.ru
# Запуск: cd ~/projects/satva_landing && bash download_assets.sh
# ============================================================

BASE_DIR="$(cd "$(dirname "$0")" && pwd)/frontend/img/yoga_tour"
VIDEO_DIR="$(cd "$(dirname "$0")" && pwd)/frontend/video"

mkdir -p "$BASE_DIR"
mkdir -p "$VIDEO_DIR"

HEADERS='-H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36" -H "Referer: https://www.satvasamui.ru/"'

ok=0; fail=0

download_file() {
  local url="$1"
  local dest="$2"
  local name="$3"
  if curl -sL --max-time 30 \
    -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36" \
    -H "Referer: https://www.satvasamui.ru/" \
    -o "$dest" "$url" && [ -s "$dest" ]; then
    echo "  ✓ $name"
    ((ok++))
  else
    echo "  ✗ FAIL: $name"
    rm -f "$dest"
    ((fail++))
  fi
}

# ============================================================
# ФОТОГРАФИИ
# ============================================================
echo ""
echo "📸 Скачиваем фотографии..."
echo "----------------------------------------"

declare -A PHOTOS=(
  # Логотип и фон hero
  ["logo.png"]="https://static.wixstatic.com/media/f5c6c5_28dc040574df4e09945dfcb7f494655c~mv2.png"
  ["hero_sunset.jpg"]="https://static.wixstatic.com/media/1c4919_24b4d3941c1a43cfb6830d487f818fa6~mv2.jpg"

  # Иконки секции "что включено"
  ["icon_beach.png"]="https://static.wixstatic.com/media/04a618_81a358dcc6b84209b76d935cbaeab127~mv2.png"
  ["icon_yoga.png"]="https://static.wixstatic.com/media/04a618_6b184695ce444508b4839252d5c8fcee~mv2.png"
  ["icon_food.png"]="https://static.wixstatic.com/media/04a618_a9d9cdc804074150b5b785f5b7169194~mv2.png"
  ["icon_meditation.png"]="https://static.wixstatic.com/media/04a618_4350a2cb642b471cb454f7b48544d4cc~mv2.png"
  ["icon_health.png"]="https://static.wixstatic.com/media/04a618_bf71c76e5e5b48ef99339fe62fc8e4ae~mv2.png"
  ["icon_seminar.png"]="https://static.wixstatic.com/media/04a618_66cee8561f0249dfbef4b31d68606eeb~mv2.png"
  ["icon_music.png"]="https://static.wixstatic.com/media/04a618_322cd6c5fe75447bb53907826df0a174~mv2.png"

  # Пляж и природа
  ["beach_day.jpg"]="https://static.wixstatic.com/media/04a618_bb7e4d4ed4db4ffdae2c1ad39313b061~mv2.jpg"
  ["beach_sunset.jpg"]="https://static.wixstatic.com/media/1c4919_51d38e0b5bdb4eeeb080a64b60c6a680~mv2.jpg"
  ["beach_calm.jpg"]="https://static.wixstatic.com/media/04a618_c0a522b0dd6340ce8983496ca3494925~mv2.jpg"

  # Йога
  ["yoga_platform.jpg"]="https://static.wixstatic.com/media/1c4919_5d0e48927adc42a99d682337c86550af~mv2.jpg"
  ["yoga_sunset.jpg"]="https://static.wixstatic.com/media/1c4919_493b116529654d45a3bace173f18de14~mv2.jpg"

  # Еда
  ["food_breakfast.jpg"]="https://static.wixstatic.com/media/04a618_0f58502231b846eba2af6eae27162cad~mv2.jpg"
  ["food_healthy.jpg"]="https://static.wixstatic.com/media/04a618_1fc097f5d4c94f90ac8791c899aa5da4~mv2.jpg"

  # Номера
  ["room_twin.jpg"]="https://static.wixstatic.com/media/1c4919_959e9456ac1040dbba3dd4fe5318d4e4~mv2.jpg"
  ["room_superior.jpg"]="https://static.wixstatic.com/media/1c4919_b85ba0df847c436ea8bdb498ae9ee59f~mv2.jpg"

  # Команда
  ["team_yulia.jpg"]="https://static.wixstatic.com/media/04a618_b99b4f23ee2b428286a347eee5ce72d0~mv2.jpg"
  ["team_dmitry.jpg"]="https://static.wixstatic.com/media/1c4919_5ff1f7ef670146aba25c0bd4d08b420c~mv2.jpg"
  ["team_galina.jpg"]="https://static.wixstatic.com/media/04a618_fcf6a442326d49bca727580930e47150~mv2.jpg"
  ["team_jet_li.jpg"]="https://static.wixstatic.com/media/04a618_223d30eaddbd48718d91b4afc1b57934~mv2.jpg"
  ["team_kirill.jpg"]="https://static.wixstatic.com/media/1c4919_a079abd6add04f31aefc02815b7145f8~mv2.jpg"

  # Аюрведа / Панчакарма
  ["ayurveda_shirodhara.jpg"]="https://static.wixstatic.com/media/1c4919_f7d9f42f556b40aa8ab66d579ba871c9~mv2.jpg"
  ["ayurveda_oil.jpg"]="https://static.wixstatic.com/media/1c4919_1cbc0c45db5741bd8ffeab480a7e9c2a~mv2.jpg"

  # Экскурсии
  ["excursion_temple.jpg"]="https://static.wixstatic.com/media/1c4919_661b1374e5e8433e9b1dcc1c49327a0f~mv2.jpg"
  ["excursion_waterfall.jpg"]="https://static.wixstatic.com/media/1c4919_7155707e1c5a4df19cd762dcf6923f18~mv2.jpg"

  # Клуб / вечер
  ["club_evening.jpg"]="https://static.wixstatic.com/media/04a618_3a1dc61c6d7e41a499618b392de94df2~mv2.jpg"
  ["club_dance.jpg"]="https://static.wixstatic.com/media/04a618_2d9ec3ff7e2441cd87f251808c350aa3~mv2.jpg"

  # Финальный CTA
  ["cta_sunset.jpg"]="https://static.wixstatic.com/media/1c4919_42e38cb27f854e6b8cc8cec78c937f8c~mv2.png"
)

for name in "${!PHOTOS[@]}"; do
  url="${PHOTOS[$name]}"
  download_file "$url" "$BASE_DIR/$name" "$name"
done

# ============================================================
# ВИДЕО-ОТЗЫВЫ
# ============================================================
echo ""
echo "🎬 Скачиваем видео-отзывы..."
echo "----------------------------------------"

declare -A VIDEOS=(
  ["review_1.mp4"]="https://video.wixstatic.com/video/1c4919_077f3f7d8b1546099b0e94f0be650513/720p/mp4/file.mp4"
  ["review_2.mp4"]="https://video.wixstatic.com/video/1c4919_6a87dc8dbacd44d6bc6b06024a9d01c9/720p/mp4/file.mp4"
  ["review_3.mp4"]="https://video.wixstatic.com/video/1c4919_5034754855cb4965b07f98a2acd1692c/720p/mp4/file.mp4"
  ["review_4.mp4"]="https://video.wixstatic.com/video/1c4919_04bc796b9e4f40f3a5a865f99b43d78e/720p/mp4/file.mp4"
  ["review_5.mp4"]="https://video.wixstatic.com/video/1c4919_0216bc5809f9465a9241f30527ca4da0/720p/mp4/file.mp4"
  ["review_6.mp4"]="https://video.wixstatic.com/video/1c4919_c61d201a8b3049a5beb91a8c56c93d57/720p/mp4/file.mp4"
  ["review_7.mp4"]="https://video.wixstatic.com/video/1c4919_09582b8119234d2db5758d291e138b2b/720p/mp4/file.mp4"
  ["review_8.mp4"]="https://video.wixstatic.com/video/1c4919_19fcfcab758547289401d4fb1bbffe4f/720p/mp4/file.mp4"
)

for name in "${!VIDEOS[@]}"; do
  url="${VIDEOS[$name]}"
  download_file "$url" "$VIDEO_DIR/$name" "$name"
done

# ============================================================
# ИТОГ
# ============================================================
echo ""
echo "========================================"
echo "✅ Успешно: $ok файлов"
echo "❌ Ошибок:  $fail файлов"
echo ""
echo "Фото →  frontend/img/yoga_tour/"
echo "Видео → frontend/video/"
echo "========================================"
