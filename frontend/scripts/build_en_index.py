#!/usr/bin/env python3
"""Generate English index.html from Russian ru/index.html per TZ."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
src = (ROOT / "ru/index.html").read_text(encoding="utf-8")

EN_PHONE_SELECT = '''<select id="yogaPhoneCode" class="yoga-form__select yoga-form__select--phone-code" autocomplete="tel-country-code">
                                <optgroup label="Most used">
                                    <option value="+1">+1 (US/CA)</option>
                                    <option value="+44">+44 (UK)</option>
                                    <option value="+61">+61 (AU)</option>
                                    <option value="+64">+64 (NZ)</option>
                                    <option value="+49">+49 (DE)</option>
                                    <option value="+33">+33 (FR)</option>
                                    <option value="+66">+66 (TH)</option>
                                    <option value="+65">+65 (SG)</option>
                                    <option value="+971">+971 (AE)</option>
                                </optgroup>
                                <optgroup label="Europe">
                                    <option value="+7">+7 (RU/KZ)</option>
                                    <option value="+380">+380 (UA)</option>
                                    <option value="+375">+375 (BY)</option>
                                    <option value="+355">+355 (AL)</option>
                                    <option value="+43">+43 (AT)</option>
                                    <option value="+32">+32 (BE)</option>
                                    <option value="+387">+387 (BA)</option>
                                    <option value="+359">+359 (BG)</option>
                                    <option value="+385">+385 (HR)</option>
                                    <option value="+420">+420 (CZ)</option>
                                    <option value="+45">+45 (DK)</option>
                                    <option value="+372">+372 (EE)</option>
                                    <option value="+358">+358 (FI)</option>
                                    <option value="+30">+30 (GR)</option>
                                    <option value="+36">+36 (HU)</option>
                                    <option value="+354">+354 (IS)</option>
                                    <option value="+353">+353 (IE)</option>
                                    <option value="+39">+39 (IT)</option>
                                    <option value="+383">+383 (XK)</option>
                                    <option value="+371">+371 (LV)</option>
                                    <option value="+423">+423 (LI)</option>
                                    <option value="+370">+370 (LT)</option>
                                    <option value="+352">+352 (LU)</option>
                                    <option value="+356">+356 (MT)</option>
                                    <option value="+377">+377 (MC)</option>
                                    <option value="+382">+382 (ME)</option>
                                    <option value="+389">+389 (MK)</option>
                                    <option value="+373">+373 (MD)</option>
                                    <option value="+31">+31 (NL)</option>
                                    <option value="+47">+47 (NO)</option>
                                    <option value="+48">+48 (PL)</option>
                                    <option value="+351">+351 (PT)</option>
                                    <option value="+40">+40 (RO)</option>
                                    <option value="+381">+381 (RS)</option>
                                    <option value="+378">+378 (SM)</option>
                                    <option value="+421">+421 (SK)</option>
                                    <option value="+386">+386 (SI)</option>
                                    <option value="+34">+34 (ES)</option>
                                    <option value="+46">+46 (SE)</option>
                                    <option value="+41">+41 (CH)</option>
                                    <option value="+90">+90 (TR)</option>
                                    <option value="+357">+357 (CY)</option>
                                    <option value="+374">+374 (AM)</option>
                                    <option value="+994">+994 (AZ)</option>
                                    <option value="+995">+995 (GE)</option>
                                    <option value="+972">+972 (IL)</option>
                                </optgroup>
                                <optgroup label="Asia &amp; Pacific">
                                    <option value="+880">+880 (BD)</option>
                                    <option value="+975">+975 (BT)</option>
                                    <option value="+855">+855 (KH)</option>
                                    <option value="+86">+86 (CN)</option>
                                    <option value="+852">+852 (HK)</option>
                                    <option value="+91">+91 (IN)</option>
                                    <option value="+62">+62 (ID)</option>
                                    <option value="+81">+81 (JP)</option>
                                    <option value="+82">+82 (KR)</option>
                                    <option value="+856">+856 (LA)</option>
                                    <option value="+853">+853 (MO)</option>
                                    <option value="+60">+60 (MY)</option>
                                    <option value="+976">+976 (MN)</option>
                                    <option value="+95">+95 (MM)</option>
                                    <option value="+92">+92 (PK)</option>
                                    <option value="+63">+63 (PH)</option>
                                    <option value="+94">+94 (LK)</option>
                                    <option value="+886">+886 (TW)</option>
                                    <option value="+84">+84 (VN)</option>
                                    <option value="+996">+996 (KG)</option>
                                    <option value="+998">+998 (UZ)</option>
                                    <option value="+992">+992 (TJ)</option>
                                    <option value="+993">+993 (TM)</option>
                                </optgroup>
                                <optgroup label="Middle East &amp; Africa">
                                    <option value="+213">+213 (DZ)</option>
                                    <option value="+20">+20 (EG)</option>
                                    <option value="+964">+964 (IQ)</option>
                                    <option value="+98">+98 (IR)</option>
                                    <option value="+962">+962 (JO)</option>
                                    <option value="+965">+965 (KW)</option>
                                    <option value="+961">+961 (LB)</option>
                                    <option value="+218">+218 (LY)</option>
                                    <option value="+212">+212 (MA)</option>
                                    <option value="+234">+234 (NG)</option>
                                    <option value="+968">+968 (OM)</option>
                                    <option value="+970">+970 (PS)</option>
                                    <option value="+974">+974 (QA)</option>
                                    <option value="+966">+966 (SA)</option>
                                    <option value="+27">+27 (ZA)</option>
                                    <option value="+249">+249 (SD)</option>
                                    <option value="+216">+216 (TN)</option>
                                    <option value="+967">+967 (YE)</option>
                                    <option value="+254">+254 (KE)</option>
                                </optgroup>
                                <optgroup label="Americas">
                                    <option value="+54">+54 (AR)</option>
                                    <option value="+591">+591 (BO)</option>
                                    <option value="+55">+55 (BR)</option>
                                    <option value="+56">+56 (CL)</option>
                                    <option value="+57">+57 (CO)</option>
                                    <option value="+506">+506 (CR)</option>
                                    <option value="+53">+53 (CU)</option>
                                    <option value="+593">+593 (EC)</option>
                                    <option value="+502">+502 (GT)</option>
                                    <option value="+504">+504 (HN)</option>
                                    <option value="+52">+52 (MX)</option>
                                    <option value="+505">+505 (NI)</option>
                                    <option value="+507">+507 (PA)</option>
                                    <option value="+595">+595 (PY)</option>
                                    <option value="+51">+51 (PE)</option>
                                    <option value="+597">+597 (SR)</option>
                                    <option value="+598">+598 (UY)</option>
                                    <option value="+58">+58 (VE)</option>
                                </optgroup>
                            </select>'''

EN_PHONE_SELECT_MODAL = EN_PHONE_SELECT.replace('id="yogaPhoneCode"', 'id="yogaLeadModalPhoneCode"')

# Remove VK, MAX, Telegram channel contact blocks
VK_BLOCK = re.compile(
    r'\s*<li>\s*<a href="https://vk\.com/satvasamui".*?</li>\s*',
    re.DOTALL,
)
MAX_BLOCK = re.compile(
    r'\s*<li>\s*<a href="https://max\.ru/[^"]*".*?</li>\s*',
    re.DOTALL,
)
TG_CHANNEL_BLOCK = re.compile(
    r'\s*<li>\s*<a href="https://t\.me/satva_samui".*?</li>\s*',
    re.DOTALL,
)

PHONE_SELECT_PATTERN = re.compile(
    r'<select id="yogaPhoneCode" class="yoga-form__select yoga-form__select--phone-code" autocomplete="tel-country-code">.*?</select>',
    re.DOTALL,
)
PHONE_SELECT_MODAL_PATTERN = re.compile(
    r'<select id="yogaLeadModalPhoneCode" class="yoga-form__select yoga-form__select--phone-code" autocomplete="tel-country-code">.*?</select>',
    re.DOTALL,
)

REPLACEMENTS = [
    ('<html lang="ru">', '<html lang="en">'),
    ('<title>Satva Samui — Йога-тур в Таиланд | 70$ в сутки, всё включено</title>',
     '<title>Satva Samui — Yoga Retreat Koh Samui, Thailand | From $70/night All-Inclusive</title>'),
    ('content="Йога-тур в Таиланд на острове Самуи от 70$ в сутки. Включает проживание у моря, 2 йоги в день, завтрак и обед, диагностику по пульсу. Процедуры аюрведы — по запросу, за доп. плату."',
     'content="Beachfront yoga retreat on Koh Samui, Thailand from $70/night. Includes accommodation steps from the sea, twice-daily yoga, breakfast &amp; lunch, and Ayurvedic health consultation."'),
    ('content="йога тур Таиланд, йога Самуи, йога отдых Таиланд, Satva Samui, йога отель, всё включено"',
     'content="yoga retreat koh samui, thailand yoga holiday, wellness retreat thailand, ayurveda retreat thailand, all-inclusive yoga holiday thailand, Satva Samui"'),
    ('content="Satva Samui — Йога-тур в Таиланд | от 70$ в сутки"',
     'content="Satva Samui Yoga Retreat — Koh Samui, Thailand | From $70/night"'),
    ('content="Йога, пляж, здоровое питание и диагностика по пульсу. От 70$ в сутки. Процедуры — дополнительно, по запросу."',
     'content="Beachfront yoga, nourishing meals, and Ayurvedic pulse reading. From $70/night. Wellness programmes available on request."'),
    ('content="ru_RU"', 'content="en_US"'),
    ('content="Йога, пляж, питание и диагностика по пульсу. Процедуры — по запросу, за доп. плату."',
     'content="Yoga, beach, nourishing meals and wellness consultation. Programmes available on request."'),
    ('<link rel="canonical" href="https://satvasamui.com/ru/">',
     '<link rel="canonical" href="https://satvasamui.com/">'),
    ('<meta property="og:url" content="https://satvasamui.com/ru/">',
     '<meta property="og:url" content="https://satvasamui.com/">'),
    ('"description": "Йога-отель в Таиланде, остров Самуи: йога у моря, аюрведа, пляж, программы оздоровления."',
     '"description": "Beachfront yoga retreat on Koh Samui, Thailand: sunrise yoga, Ayurveda, wellness programmes and direct beach access."'),
    ('"url": "https://satvasamui.com/ru/"', '"url": "https://satvasamui.com/"'),
    ('            "https://t.me/satva_samui",\n            "https://vk.com/satvasamui",\n            "https://max.ru/u/f9LHodD0cOLc_flBAhqBi__W1pjf_FyvcbVfoPehdyQAhAn956Skt8SDXlI"', ''),
    ('Перейти к началу страницы', 'Skip to main content'),
    ('aria-label="Satva Samui — Йога-отель"', 'aria-label="Satva Samui — Yoga Retreat"'),
    ('Satva Samui <span>|</span> Йога-отель', 'Satva Samui <span>|</span> Yoga Retreat'),
    ('<strong>Йога-тур</strong> <strong>в Таиланд</strong><br>на ваши даты',
     '<strong>Your Private Yoga Retreat</strong><br><strong>in Thailand</strong>'),
    ('aria-label="Открыть меню"', 'aria-label="Open menu"'),
    ('aria-label="Основная навигация"', 'aria-label="Main navigation"'),
    ('>Что включено<', ">What's Included<"),
    ('>Программа<', '>Program<'),
    ('>Номера<', '>Rooms<'),
    ('>Специалисты<', '>Our Team<'),
    ('>Отзывы<', '>Reviews<'),
    ('>Вопросы<', '>FAQ<'),
    ('>Забронировать<', '>Book Now<'),
    ('aria-label="Satva Samui — йога-тур в Таиланд"', 'aria-label="Satva Samui — yoga retreat in Thailand"'),
    ('70&nbsp;$&nbsp;сутки', '$70 / night'),
    ('>всё включено<', '>All-Inclusive<'),
    ('при 2-местном размещении в номере «Стандарт».', 'per person, double Standard Room'),
    ('Вы будете жить на берегу тихого, спокойного моря и&nbsp;наслаждаться прекрасными закатами.',
     'Wake up to the sound of waves. Fall asleep to the colours of the sunset.'),
    ('>Йога на рассвете и закате<', '>Sunrise &amp; Sunset Yoga<'),
    ('>Сбалансированное питание<', '>Nourishing Plant-Based Meals<'),
    ('>Индивидуальный план оздоровления<', '>Personalised Wellness Plan<'),
    ('>Аюрведический расслабляющий массаж в подарок<', '>Complimentary Ayurvedic Relaxation Massage<'),
    ('>Оставить заявку на даты<', '>Book Your Retreat<'),
    ('>листать<', '>scroll<'),
    ('>Почему нам доверяют<', '>Why Guests Choose Satva Samui<'),
    ('>лет работы на Самуи<', '>Years on Koh Samui<'),
    ('>гостей посетили наш отель<', '>Guests from Around the World<'),
    ('>средний рейтинг в Google —', '>Stars on Google —'),
    ('>смотреть отзывы гостей<', '>Read guest reviews<'),
    ('>Что входит в тур<', '>Everything Included in Your Retreat<'),
    ('>Отель у моря<', '>Beachfront Accommodation<'),
    ('Уютные номера со всеми удобствами на первой линии моря.',
     'Comfortable rooms with all amenities, steps from the sea.'),
    ('Занятия проходят на берегу моря. Йога для любого уровня подготовки. Опытные йога-инструкторы позаботятся, чтобы ваши практики были незабываемыми.',
     'Practice yoga on an open-air platform overlooking the sea. Suitable for all levels — from complete beginners to experienced practitioners. Our certified instructors ensure every session is both accessible and transformative.'),
    ('Вкусные и полезные завтраки и обеды включены в программу тура. Ужин можно заказать дополнительно.',
     'Vegetarian breakfasts and lunches are included. Dinners available on request. Gluten-free and vegan menus available.'),
    ('>Медитация<', '>Guided Meditation<'),
    ('Мантра-медитация — мягкая и эффективная практика, которая успокаивает ум, снимает накопленный стресс и восстанавливает здоровый сон.',
     'A gentle and effective technique that calms the mind, eases stress, and restores natural sleep rhythms.'),
    ('>Диагностика здоровья по пульсу<', '>Ayurvedic Pulse Reading (Nadi Pariksha)<'),
    ('Индивидуальная программа здоровья от специалиста аюрведы, рекомендации по питанию и очищению организма.',
     'A personalised wellness assessment by our Ayurvedic doctor, including dietary and lifestyle recommendations tailored to your constitution.'),
    ('>Оздоровительные программы<', '>Wellness Programmes<'),
    ('Панчакарма — очищение на клеточном уровне, Аюрведический Детокс, массажи, акупунктура, рейки и многое другое.',
     'Panchakarma deep cleanse, Ayurvedic Detox, therapeutic massage, acupuncture, Reiki and more.'),
    ('>Экскурсии<', '>Island Excursions<'),
    ('Самые красивые места острова, морские прогулки, водопады. С вами будет русскоговорящий гид-фотограф.',
     "Koh Samui's hidden gems, boat trips and waterfalls. Your English-speaking guide-photographer will capture the island's hidden gems."),
    ('&nbsp;— оплачивается отдельно, не входит в базовый пакет тура.',
     '&nbsp;— Available at an additional cost, not included in the base package.'),
    ('aria-label="Инфраструктура, включённая в пакет"', 'aria-label="Hotel amenities included in your retreat"'),
    ('>На территории отеля:<', '>On the hotel grounds:<'),
    ('>2 йога-зала<', '>2 Yoga Studios<'),
    ('>Ресторан у моря<', '>Beachfront Restaurant<'),
    ('>3 бассейна<', '>3 Swimming Pools<'),
    ('>3 массажных кабинета<', '>3 Treatment Rooms<'),
    ('>Спа-салон<', '>Spa<'),
    ('>2 сауны<', '>2 Saunas<'),
    ('>Тренажерный зал<', '>Fitness Centre<'),
    ('>Конференц-зал<', '>Conference Room<'),
    ('>Отель расположен на берегу моря<', '>A Retreat Right on the Beach<'),
    ('alt="Пляж Липа Ной на Самуи — отель Satva Samui на берегу моря"',
     'alt="Lipa Noi Beach on Koh Samui — Satva Samui beachfront retreat"'),
    ('>Липа Ной — один из лучших пляжей на Самуи:<', ">Lipa Noi is one of Koh Samui's most tranquil beaches:<"),
    ('>Мелкий чистый песок<', '>Soft white sand<'),
    ('>Плавный заход в море без камней и кораллов<', '>Gentle slope with no rocks or coral — perfect for swimming<'),
    ('>Температура воды +27…+30 °C круглый год<', '>Warm seas year-round: 27–30°C (81–86°F)<'),
    ('>Мало туристов<', '>Uncrowded and peaceful<'),
    ('>Прекрасные закаты каждый вечер<', '>Breathtaking sunsets every evening<'),
    ('>Йога-площадка прямо на берегу моря<', '>An Open-Air Yoga Deck Overlooking the Sea<'),
    ('alt="Йога-площадка на берегу моря в Satva Samui — занятия на закате"',
     'alt="Open-air yoga deck at Satva Samui overlooking the sea at sunset"'),
    ('Йога на рассвете и закате.', 'Yoga at sunrise and sunset.'),
    ('Профессиональные йога-инструкторы позаботятся о том, чтобы ваша практика прошла легко и эффективно.\n                        Занятия подходят для любого уровня — от новичка до опытного практикующего.',
     "Our certified instructors guide every session — whether you're stepping onto the mat for the first time or deepening an existing practice."),
    ('>На занятиях вы освоите:<', '>Each session may include:<'),
    ('>Комплекс для здоровой спины и ровной осанки<', '>Sequences for spinal health and posture<'),
    ('>Практики для нормализации веса и обмена веществ<', '>Practices to support healthy metabolism and weight balance<'),
    ('>Техники снятия стресса и умственного напряжения<', '>Stress-relief and mental clarity techniques<'),
    ('>Дыхательные упражнения (пранаяма)<', '>Breathwork (Pranayama)<'),
    ('>И другие техники для здоровья<', '>And more practices for overall wellbeing<'),
    ('>Еда как забота о себе<', '>Food as Self-Care<'),
    ('alt="Тропический завтрак с фруктовыми соками на пляже"', 'alt="Tropical vegetarian breakfast with fresh juices on the beach"'),
    ('Мы разработали для вас сбалансированное меню. Такая еда не только вкусная, но и полезная:\n                    она питает ваше тело, даёт лёгкость и энергию.',
     "We've created a balanced menu of nourishing vegetarian dishes — wholesome, flavourful food that gives you energy without heaviness."),
    ('В программу тура включены вегетарианские завтраки и обеды. Ужин можно заказать дополнительно.',
     'Vegetarian breakfasts and lunches are included in every package.'),
    ('>По запросу возможно меню без глютена, веган<', '>Gluten-free and vegan options available on request<'),
    ('>Шесть типов размещения<', '>Six Accommodation Options<'),
    ('aria-roledescription="карусель"', 'aria-roledescription="carousel"'),
    ('aria-label="Типы номеров"', 'aria-label="Room types"'),
    ('aria-roledescription="слайд"', 'aria-roledescription="slide"'),
    ('aria-label="1 из 6"', 'aria-label="1 of 6"'),
    ('aria-label="2 из 6"', 'aria-label="2 of 6"'),
    ('aria-label="3 из 6"', 'aria-label="3 of 6"'),
    ('aria-label="4 из 6"', 'aria-label="4 of 6"'),
    ('aria-label="5 из 6"', 'aria-label="5 of 6"'),
    ('aria-label="6 из 6"', 'aria-label="6 of 6"'),
    ('aria-roledescription="галерея"', 'aria-roledescription="gallery"'),
    ('aria-label="Листание фото в текущем типе номера"', 'aria-label="Browse photos for this room type"'),
    ('>Номер Стандарт<', '>Standard Room<'),
    ('alt="Номер Стандарт, интерьер с кроватью"', 'alt="Standard Room interior with bed"'),
    ('aria-label="Предыдущее фото: Номер Стандарт"', 'aria-label="Previous photo: Standard Room"'),
    ('aria-label="Следующее фото: Номер Стандарт"', 'aria-label="Next photo: Standard Room"'),
    ('aria-label="Фотографии: Номер Стандарт"', 'aria-label="Photos: Standard Room"'),
    ('aria-label="Номер Стандарт, фото 1 из 6"', 'aria-label="Standard Room, photo 1 of 6"'),
    ('aria-label="Номер Стандарт, фото 2 из 6"', 'aria-label="Standard Room, photo 2 of 6"'),
    ('aria-label="Номер Стандарт, фото 3 из 6"', 'aria-label="Standard Room, photo 3 of 6"'),
    ('aria-label="Номер Стандарт, фото 4 из 6"', 'aria-label="Standard Room, photo 4 of 6"'),
    ('aria-label="Номер Стандарт, фото 5 из 6"', 'aria-label="Standard Room, photo 5 of 6"'),
    ('aria-label="Номер Стандарт, фото 6 из 6"', 'aria-label="Standard Room, photo 6 of 6"'),
    ('>5–20&nbsp;м от моря<', '>5–20 m from the sea<'),
    ('>Веранда<', '>Private Veranda<'),
    ('>Одна большая кровать или раздельные<', '>King bed or twin beds<'),
    ('>Узнать стоимость<', '>Check Availability &amp; Pricing<'),
    ('>Номер Стандарт с видом на море<', '>Standard Sea View Room<'),
    ('alt="Номер Стандарт с видом на море, терраса и вид на море"', 'alt="Standard Sea View Room with terrace and ocean view"'),
    ('aria-label="Предыдущее фото: Номер Стандарт с видом на море"', 'aria-label="Previous photo: Standard Sea View Room"'),
    ('aria-label="Следующее фото: Номер Стандарт с видом на море"', 'aria-label="Next photo: Standard Sea View Room"'),
    ('aria-label="Фотографии: Номер Стандарт с видом на море"', 'aria-label="Photos: Standard Sea View Room"'),
    ('aria-label="Номер Стандарт с видом на море, фото 1 из 4"', 'aria-label="Standard Sea View Room, photo 1 of 4"'),
    ('aria-label="Номер Стандарт с видом на море, фото 2 из 4"', 'aria-label="Standard Sea View Room, photo 2 of 4"'),
    ('aria-label="Номер Стандарт с видом на море, фото 3 из 4"', 'aria-label="Standard Sea View Room, photo 3 of 4"'),
    ('aria-label="Номер Стандарт с видом на море, фото 4 из 4"', 'aria-label="Standard Sea View Room, photo 4 of 4"'),
    ('>5 метров до моря<', '>Just 5 metres to the sea<'),
    ('>Свой шезлонг<', '>Personal sun lounger<'),
    ('>Веранда с видом на море и закаты<', '>Sea view veranda with sunset views<'),
    ('>Одна большая кровать<', '>King bed<'),
    ('>Домик Стандарт<', '>Standard Garden Bungalow<'),
    ('alt="Домик Стандарт, вид снаружи"', 'alt="Standard Garden Bungalow exterior"'),
    ('aria-label="Предыдущее фото: Домик Стандарт"', 'aria-label="Previous photo: Standard Garden Bungalow"'),
    ('aria-label="Следующее фото: Домик Стандарт"', 'aria-label="Next photo: Standard Garden Bungalow"'),
    ('aria-label="Фотографии: Домик Стандарт"', 'aria-label="Photos: Standard Garden Bungalow"'),
    ('aria-label="Домик Стандарт, фото 1 из 7"', 'aria-label="Standard Garden Bungalow, photo 1 of 7"'),
    ('aria-label="Домик Стандарт, фото 2 из 7"', 'aria-label="Standard Garden Bungalow, photo 2 of 7"'),
    ('aria-label="Домик Стандарт, фото 3 из 7"', 'aria-label="Standard Garden Bungalow, photo 3 of 7"'),
    ('aria-label="Домик Стандарт, фото 4 из 7"', 'aria-label="Standard Garden Bungalow, photo 4 of 7"'),
    ('aria-label="Домик Стандарт, фото 5 из 7"', 'aria-label="Standard Garden Bungalow, photo 5 of 7"'),
    ('aria-label="Домик Стандарт, фото 6 из 7"', 'aria-label="Standard Garden Bungalow, photo 6 of 7"'),
    ('aria-label="Домик Стандарт, фото 7 из 7"', 'aria-label="Standard Garden Bungalow, photo 7 of 7"'),
    ('>Уютный приватный домик<', '>A cosy, private bungalow<'),
    ('>Веранда и шезлонг<', '>Veranda and sun lounger<'),
    ('>Семейная вилла<', '>Family Villa<'),
    ('alt="Семейная вилла, бассейн и дом"', 'alt="Family Villa with pool"'),
    ('aria-label="Предыдущее фото: Семейная вилла"', 'aria-label="Previous photo: Family Villa"'),
    ('aria-label="Следующее фото: Семейная вилла"', 'aria-label="Next photo: Family Villa"'),
    ('aria-label="Фотографии: Семейная вилла"', 'aria-label="Photos: Family Villa"'),
    ('aria-label="Семейная вилла, фото 1 из 5"', 'aria-label="Family Villa, photo 1 of 5"'),
    ('aria-label="Семейная вилла, фото 2 из 5"', 'aria-label="Family Villa, photo 2 of 5"'),
    ('aria-label="Семейная вилла, фото 3 из 5"', 'aria-label="Family Villa, photo 3 of 5"'),
    ('aria-label="Семейная вилла, фото 4 из 5"', 'aria-label="Family Villa, photo 4 of 5"'),
    ('aria-label="Семейная вилла, фото 5 из 5"', 'aria-label="Family Villa, photo 5 of 5"'),
    ('>2 отдельные спальни<', '>2 separate bedrooms<'),
    ('>Санузел в каждой комнате<', '>En-suite bathroom in each room<'),
    ('>Общая гостиная<', '>Shared living room<'),
    ('>Просторная веранда<', '>Spacious terrace<'),
    ('>Бассейн рядом с виллой<', '>Private pool adjacent to the villa<'),
    ('>30&nbsp;м до моря<', '>30 metres from the sea<'),
    ('>Коттедж<', '>Cottage<'),
    ('alt="Коттедж, гостиная и спальная зона"', 'alt="Cottage living and bedroom area"'),
    ('aria-label="Предыдущее фото: Коттедж"', 'aria-label="Previous photo: Cottage"'),
    ('aria-label="Следующее фото: Коттедж"', 'aria-label="Next photo: Cottage"'),
    ('aria-label="Фотографии: Коттедж"', 'aria-label="Photos: Cottage"'),
    ('aria-label="Коттедж, фото 1 из 6"', 'aria-label="Cottage, photo 1 of 6"'),
    ('aria-label="Коттедж, фото 2 из 6"', 'aria-label="Cottage, photo 2 of 6"'),
    ('aria-label="Коттедж, фото 3 из 6"', 'aria-label="Cottage, photo 3 of 6"'),
    ('aria-label="Коттедж, фото 4 из 6"', 'aria-label="Cottage, photo 4 of 6"'),
    ('aria-label="Коттедж, фото 5 из 6"', 'aria-label="Cottage, photo 5 of 6"'),
    ('aria-label="Коттедж, фото 6 из 6"', 'aria-label="Cottage, photo 6 of 6"'),
    ('>Европейский стиль<', '>European-style interior<'),
    ('>3&nbsp;мин до моря<', '>3 min walk to the sea<'),
    ('>Большой бассейн с шезлонгами и зонтами<', '>Large pool with sun loungers and parasols<'),
    ('>Есть диван&nbsp;— дополнительное спальное место<', '>Sofa bed for an additional guest<'),
    ('>Бунгало<', '>Bungalow<'),
    ('alt="Бунгало, вид на дом с соломенной крышей"', 'alt="Bungalow with thatched roof"'),
    ('aria-label="Предыдущее фото: Бунгало"', 'aria-label="Previous photo: Bungalow"'),
    ('aria-label="Следующее фото: Бунгало"', 'aria-label="Next photo: Bungalow"'),
    ('aria-label="Фотографии: Бунгало"', 'aria-label="Photos: Bungalow"'),
    ('aria-label="Бунгало, фото 1 из 6"', 'aria-label="Bungalow, photo 1 of 6"'),
    ('aria-label="Бунгало, фото 2 из 6"', 'aria-label="Bungalow, photo 2 of 6"'),
    ('aria-label="Бунгало, фото 3 из 6"', 'aria-label="Bungalow, photo 3 of 6"'),
    ('aria-label="Бунгало, фото 4 из 6"', 'aria-label="Bungalow, photo 4 of 6"'),
    ('aria-label="Бунгало, фото 5 из 6"', 'aria-label="Bungalow, photo 5 of 6"'),
    ('aria-label="Бунгало, фото 6 из 6"', 'aria-label="Bungalow, photo 6 of 6"'),
    ('>Просторное бунгало<', '>Spacious bungalow<'),
    ('>Ванна и душ<', '>Bathtub and shower<'),
    ('>Одна большая кровать или две раздельные<', '>King or twin beds<'),
    ('>Веранда и шезлонги<', '>Veranda and sun loungers<'),
    ('>Вид на море или в сад<', '>Sea view or garden view<'),
    ('aria-label="Предыдущий тип номера"', 'aria-label="Previous room type"'),
    ('aria-label="Следующий тип номера"', 'aria-label="Next room type"'),
    ('aria-label="Выбор слайда"', 'aria-label="Choose slide"'),
    ('>Посмотрите другие варианты размещения<', '>Explore other room types<'),
    ('>В каждом номере есть<', '>Every room includes<'),
    ('>Душ с горячей водой<', '>Hot shower<'),
    ('>Стабильный Wi-Fi<', '>Reliable Wi-Fi<'),
    ('>Кондиционер<', '>Air conditioning<'),
    ('>Розетки стандартные<', '>Universal power sockets<'),
    ('>Чайник<', '>Kettle<'),
    ('>Сейф<', '>In-room safe<'),
    ('>Полотенца (пляжные и для номера)<', '>Beach and room towels<'),
    ('>Фен<', '>Hair dryer<'),
    ('<strong>В нашем уютном отеле всего 20 номеров.</strong>\n                    Успейте забронировать свой.',
     '<strong>Our boutique retreat has just 20 rooms.</strong> Availability is limited — book early.'),
    ('>Забронировать номер<', '>Reserve Your Room<'),
    ('>Команда профессионалов<', '>Meet Our Specialists<'),
    ('Наши мастера и специалисты позаботятся, чтоб ваш отдых прошёл с максимальной пользой для здоровья.',
     'Our practitioners are dedicated to making your stay as restorative and transformative as possible.'),
    ('alt="Юлия"', 'alt="Yulia"'),
    ('>Юлия<', '>Yulia<'),
    ('Врач аюрведы, специалист<br>по диагностике и очищению организма',
     'Ayurvedic Doctor · Pulse Diagnosis &amp; Detox Specialist'),
    ('Член Национальной Аюрведической Медицинской Ассоциации (НАМА).',
     'Member of the National Ayurvedic Medical Association (NAMA).'),
    ('Разработает для вас индивидуальную программу питания и очищения, которая поможет:',
     'Yulia creates personalised nutrition and cleansing programmes that may help you:'),
    ('>укрепить иммунитет<', '>Support immune function<'),
    ('>нормализовать вес<', '>Achieve a healthy weight<'),
    ('>улучшить сон<', '>Improve sleep quality<'),
    ('>стабилизировать гормональную систему<', '>Balance hormonal health<'),
    ('>повысить уровень жизненной энергии<', '>Increase energy and vitality<'),
    ('>избавиться от стресса<', '>Reduce stress and anxiety<'),
    ('alt="Дмитрий"', 'alt="Dmitriy"'),
    ('>Дмитрий<', '>Dmitriy<'),
    ('>Преподаватель йоги, Yoga Alliance RYT-500<', '>Yoga Teacher · Yoga Alliance RYT-500<'),
    ('Профессиональный инструктор йоги с 2006 года. Член Международного Йога Альянса.',
     'Professional yoga instructor since 2006. Registered with Yoga Alliance International.'),
    ('Дмитрий разрабатывает индивидуальные программы йоги, рассчитанные на: оздоровление позвоночника, нормализацию веса, освобождение от стрессов. Проводит инструкторские курсы с выдачей международного сертификата Yoga Alliance.',
     'Dmitriy designs personalised yoga programmes focused on spinal health, weight balance, and stress release. Also runs teacher training courses (Yoga Alliance certified).'),
    ('alt="Галина"', 'alt="Galina"'),
    ('>Галина<', '>Galina<'),
    ('>Инструктор йоги<', '>Yoga Instructor<'),
    ('Кандидат в мастеры спорта по художественной гимнастике. Более 10 лет в профессиональном спорте. Сертифицированный учитель йоги и растяжки. Создатель онлайн клуба «Йога дома».',
     'Rhythmic gymnastics competitor with over 10 years in professional sport. Certified yoga and flexibility teacher. Creator of the online programme «Yoga at Home».'),
    ('alt="Дарья в практике на природе"', 'alt="Darya practising outdoors"'),
    ('>Дарья<', '>Darya<'),
    ('>Мастер цигун и йоги, арт-терапевт<', '>Qigong &amp; Yoga Master · Art Therapist<'),
    ('Мастер акупунктуры и телесно-ориентированных практик.',
     'Acupuncture practitioner and somatic body-work specialist.'),
    ('Дипломированный психолог, более 12 лет опыта в сфере психологии и физического состояния.',
     'Qualified psychologist with 12+ years of experience in mind-body wellness.'),
    ('>Китайский целитель, мастер рейки и акупунктуры<', '>Traditional Chinese Healer · Reiki &amp; Acupuncture Master<'),
    ('Проводит мягкое и глубокое восстановление тела с помощью китайских способов оздоровления.',
     'Jet Li practises gentle, deep-healing bodywork rooted in traditional Chinese medicine.'),
    ('Опыт более 30 лет. Воздействуя на ключевые точки, мастер способен пробуждать внутреннюю исцеляющую энергию.',
     "With over 30 years of experience, he works with key energy points to stimulate the body's own healing capacity."),
    ('alt="Широдхара — поток тёплого масла на лоб в аюрведической программе Панчакармы"',
     'alt="Shirodhara — warm oil flowing on the forehead during Panchakarma"'),
    ('>Панчакарма в Satva Samui<', '>Panchakarma at Satva Samui<'),
    ('Аюрведическая процедура очищения организма на клеточном уровне с помощью натуральных лечебных масел и трав.',
     'An ancient Ayurvedic deep-cleansing therapy using therapeutic oils and medicinal herbs.'),
    ('Панчакарма лечит многие хронические заболевания, которые в западной медицине признаны неизлечимыми. Также панчакарма оказывает благоприятное влияние на психическое и эмоциональное состояние, избавляя от стрессов и бессонницы.',
     'Many guests experience profound improvements in chronic conditions through this time-tested practice. Panchakarma is also known to support mental and emotional wellbeing — many guests report improved sleep and reduced stress.'),
    ('>Подробнее<', '>Learn More<'),
    ('>Оздоровительная программа<', '>Wellness Programme<'),
    ('>Детокс на всех трёх уровнях:<', '>A holistic detox across three dimensions:<'),
    ('aria-label="Физический уровень"', 'aria-label="Physical"'),
    ('>Физический уровень<', '>Physical<'),
    ('>диагностика по пульсу;<', '>Ayurvedic pulse reading;<'),
    ('>индивидуальный план оздоровления;<', '>personalised wellness plan;<'),
    ('>Аюрведический Детокс;<', '>Ayurvedic Detox;<'),
    ('>препараты для восстановления функций органов;<', '>Ayurvedic herbal supplements to support organ function;<'),
    ('>процедуры очищения на клеточном уровне (Панчакарма);<', '>Panchakarma deep cleanse;<'),
    ('>китайские техники оздоровления (правки шеи, спины, живота и др.).<',
     '>Traditional Chinese bodywork (neck, back, abdominal alignment and more).<'),
    ('aria-label="Психический уровень"', 'aria-label="Mental"'),
    ('>Психический уровень<', '>Mental<'),
    ('>расслабляющие практики дыхания и медитации;<', '>Breathwork and guided meditation for deep relaxation;<'),
    ('>мощные практики по телу для полного расслабления и восстановления нервной системы;<',
     '>Somatic body practices to fully relax and restore the nervous system;<'),
    ('>арт-терапия;<', '>Art therapy;<'),
    ('>препараты Аюрведы для здоровья нервов, сердца и сосудов;<',
     '>Ayurvedic herbal support for the nervous and cardiovascular system;<'),
    ('aria-label="Душевный уровень"', 'aria-label="Spiritual"'),
    ('>Душевный уровень<', '>Spiritual<'),
    ('>мощные практики медитации;<', '>Advanced meditation practices;<'),
    ('>мантра-терапия;<', '>Mantra therapy;<'),
    ('>био-управление;<', '>Biofeedback;<'),
    ('>саунд-хилинг.<', '>Sound healing.<'),
    ('alt="Натуральные аюрведические препараты и травы для программы детокса"',
     'alt="Natural Ayurvedic herbs and supplements for detox programme"'),
    ('>Аюрведический Детокс<', '>Ayurvedic Detox<'),
    ('>ключевая программа<', '>Signature Programme<'),
    ('Программа очищения создана врачами, специалистами аюрведы и доказательной медицины. Все ингредиенты натуральные, мы используем аюрведические препараты, которые способствуют мягкому и глубокому очищению.',
     'Developed by Ayurvedic doctors and evidence-informed practitioners. All ingredients are natural — we use Ayurvedic herbal preparations that support gentle, deep cleansing.'),
    ('alt="Фруктовые и овощные смузи с тропическими фруктами"', 'alt="Fresh fruit and vegetable smoothies with tropical fruits"'),
    ('>Смузи-детокс<', '>Juice &amp; Smoothie Detox<'),
    ('3 дня очищения на фруктовых и овощных смузи помогут мягко очистить организм и дадут лёгкость и энергию. Помогает снизить вес.',
     'A 3-day cleanse on fresh fruit and vegetable smoothies — a gentle reset that brings lightness and renewed energy. Many guests find it supports healthy weight loss.'),
    ('alt="Расслабляющий массаж с травяными мешочками и маслом"', 'alt="Relaxing massage with herbal pouches and oil"'),
    ('>Массажи<', '>Therapeutic Massage<'),
    ('Разные виды тайского и китайского массажа: расслабляющий, лимфодренажный, массаж горячими мешочками, детокс-массаж и другие.',
     'A range of Thai and Chinese massage styles: relaxation, lymphatic drainage, herbal pouch massage, detox massage and more.'),
    ('alt="Акупунктура уха — установка тонких игл в точки на ушной раковине"', 'alt="Auricular acupuncture — fine needles placed on ear points"'),
    ('>Акупунктура уха<', '>Auricular Acupuncture<'),
    ('Восстанавливает нервную систему, улучшает сон, снимает напряжение и зажимы в теле, запускает процесс очищения организма, воздействует на работу почек, печени, лёгких, избавляет от зависимостей (алкоголь и др.).',
     "A traditional technique that may support nervous system recovery, improve sleep, relieve physical tension, and assist with the body's natural detoxification. Some clients also use it as part of addiction recovery programmes."),
    ('alt="Сеанс рейки — мастер прикладывает ладони к животу гостя"', 'alt="Reiki session — practitioner placing hands on guest"'),
    ('>Рейки<', '>Reiki<'),
    ('Процедуру проводит китайский мастер: с помощью прикосновения ладоней он передаёт целительную энергию. Рейки пробуждает вашу способность к самоисцелению. Эта практика устраняет блоки и снимает стресс.',
     "Led by Jet Li, a Chinese Reiki master: through gentle hand placements, healing energy is channelled to stimulate the body's own recovery. Reiki is known to support deep relaxation, reduce energetic blockages, and ease stress."),
    ('aria-label="Экскурсии по острову и вечерний Сатва-клуб"', 'aria-label="Island excursions and evening Satva club"'),
    ('alt="Храм и природа Самуи"', 'alt="Temple and nature on Koh Samui"'),
    ('>Остров, который удивляет<', '>Discover the Island<'),
    ('Мы организуем для вас незабываемые экскурсии, покажем вам самые красивые и необычные места острова, о которых знают не все турагентства.\n                        Смотровые площадки в горах, бурлящие водопады, морские путешествия на соседние острова, древние храмы.\n                        С вами будет русскоговорящий гид-фотограф, который сделает яркие фотографии на память.',
     "We organise unforgettable island excursions — revealing Koh Samui's hidden gems that most tourists never see. Mountain viewpoints, cascading waterfalls, boat trips to nearby islands, ancient temples. Your English-speaking guide-photographer will take stunning photos to capture the memories."),
    ('<span class="yoga-includes__optional">*</span> Экскурсии оплачиваются отдельно и не входят в базовый пакет йога-тура.',
     '<span class="yoga-includes__optional">*</span> Excursions are available at an additional cost and are not part of the base retreat package.'),
    ('alt="Сатва-клуб вечером"', 'alt="Satva club in the evening"'),
    ('>Каждый вечер – медитация и живая музыка<', '>Every Evening — Meditation &amp; Live Music<'),
    ('Мантра-медитация, которая успокаивает ум и благоприятно влияет на физическое, ментальное и душевное здоровье.',
     'A nightly mantra meditation session to calm the mind and nurture physical, mental and spiritual wellbeing.'),
    ('>Отзывы гостей<', '>Guest Reviews<'),
    ('Многие из наших гостей приезжают в отель повторно, рекомендуют нас своим друзьям и близким.',
     'Many of our guests return year after year — and we love when they bring friends and family.'),
    ('aria-label="Открыть видео: первая поездка в йога-тур, погружение в практику, море, природа и команда"',
     'aria-label="Open video: first yoga retreat experience, immersion in practice, sea, nature and team"'),
    ('>Видео-отзыв 1<', '>Guest Video Review 1<'),
    ('Первая поездка в йога-тур, потрясающее погружение в йогу. Море, природа, команда, атмосфера – крутейший опыт. Первый такой отдых за 20 лет',
     "First yoga retreat experience — a total immersion. The sea, nature, team and atmosphere made it the most meaningful holiday I've had in 20 years."),
    ('aria-label="Открыть видео: второй визит в Сатва Самуи, силы и баланс, благодарность команде"',
     'aria-label="Open video: second visit to Satva Samui, strength and balance"'),
    ('>Видео-отзыв 2<', '>Guest Video Review 2<'),
    ('Второй раз приехала в Сатва Самуи. Набралась силы, спокойствия, баланса, энергии. Благодарна всем, кто его создаёт',
     'Back for my second stay at Satva Samui. I always leave with renewed energy, inner calm and a clearer sense of balance.'),
    ('aria-label="Открыть видео: второй отдых в Сатва, йога и ощущение тела, панчакарма, гости приедут снова"',
     'aria-label="Open video: second stay, yoga and body awareness, Panchakarma"'),
    ('>Видео-отзыв 3<', '>Guest Video Review 3<'),
    ('Второй раз отдыхаем тут, всё очень нравится. Благодарность за йогу, снова почувствовали своё тело, как в 20 лет. Панчакарма — даёт прекрасные результаты. Обязательно приедем снова',
     "Our second visit and it just keeps getting better. The yoga practice reconnected us with our bodies, and Panchakarma delivered wonderful results. We'll definitely be back."),
    ('aria-label="Открыть видео: уникальное место для йоги, природа и море, спокойная атмосфера"',
     'aria-label="Open video: unique place for yoga, nature and sea"'),
    ('>Видео-отзыв 4<', '>Guest Video Review 4<'),
    ('Уникальное место для отдыха и занятий йогой. Всё волшебное — природа, воздух, море, атмосфера. Здесь спокойно, душевно, каждый найдёт то, что хочет',
     "A truly unique place for rest and yoga. Peaceful, soulful and welcoming — everyone will find what they're looking for here."),
    ('aria-label="Открыть видео: море и природа, дружелюбный персонал и индивидуальный подход"',
     'aria-label="Open video: sea and nature, friendly staff"'),
    ('>Видео-отзыв 5<', '>Guest Video Review 5<'),
    ('Море твоё! Много воздуха, зелени, спокойствия. Очень дружелюбный персонал. К вам относятся внимательно и с индивидуальным подходом, что очень ценно',
     "The beach feels like it's all yours! So much fresh air, greenery and tranquillity. The staff are incredibly warm and attentive."),
    ('aria-label="Открыть видео: атмосфера и природа как рай, мантра-медитация, гость продолжит практику"',
     'aria-label="Open video: paradise atmosphere, mantra meditation"'),
    ('>Видео-отзыв 6<', '>Guest Video Review 6<'),
    ('Мы попали в рай — звуки, запахи, столько зелени вокруг. Мантра-медитация — открытие для меня, буду продолжать практиковать',
     "We felt like we'd arrived in paradise — the sounds, the scents, the lush greenery. Mantra meditation was a revelation I'll carry home."),
    ('aria-label="Открыть видео: отдых для здоровья, души и тела, панчакарма, массажи и специалисты"',
     'aria-label="Open video: restorative stay, Panchakarma and massage"'),
    ('>Видео-отзыв 7<', '>Guest Video Review 7<'),
    ('Отдых полезный для здоровья, для души и тела. Сделали Панчакарму, массажи, замечательные специалисты',
     'A deeply restorative stay — for both body and soul. We did Panchakarma and massage sessions with wonderful practitioners.'),
    ('aria-label="Открыть видео: рекомендация приехать, спокойный отдых, команда, гость в восторге"',
     'aria-label="Open video: recommendation to visit, peaceful stay"'),
    ('>Видео-отзыв 8<', '>Guest Video Review 8<'),
    ('Рекомендую всем приехать сюда. Волшебный отдых — спокойно, красиво, замечательная команда. Я в восторге!',
     "I recommend this place to absolutely everyone. A magical experience — peaceful, beautiful and with the most wonderful team. I'm completely in love with Satva Samui!"),
    ('aria-label="Закрыть плеер"', 'aria-label="Close video player"'),
    ('>Свяжитесь с нами<', '>Get in Touch<'),
    ('Напишите нам удобным для вас способом, и мы с радостью ответим на все вопросы, поможем забронировать тур и подскажем по перелёту.',
     "Reach out via your preferred channel — we'll answer all your questions, assist with booking, and help you plan your journey to Koh Samui."),
    ('>Телеграм канал<', '>Telegram Channel<'),
    ('aria-label="Написать в мессенджере MAX"', ''),
    ('aria-label="ВКонтакте"', ''),
    ('>Частые вопросы<', '>Frequently Asked Questions<'),
    ('>Что входит в стоимость от 70&nbsp;$ в сутки?<', ">What's included in the price from $70/night?<"),
    ('Проживание, завтрак и обед, йога 2 раза в день, вечерние медитации. При бронировании от 7 дней — диагностика здоровья по пульсу и рекомендации специалиста по питанию и очищению, плюс инфраструктура отеля: сауны, зал, бассейны, каяки и падлборды. Отдельно оплачиваются оздоровительные программы, экскурсии, перелёт и трансфер. 70&nbsp;$ в сутки — при 2-местном размещении в номере «Стандарт»; стоимость при одноместном размещении уточняйте при бронировании.',
     "Accommodation, breakfast and lunch, twice-daily yoga sessions, evening meditation. For stays of 7+ nights, an Ayurvedic pulse reading and wellness consultation are also included, plus full use of the hotel's amenities: saunas, gym, pools, kayaks and paddleboards. Wellness programmes, excursions, flights and transfers are not included. The $70/night rate is per person based on double occupancy of a Standard Room; solo rates available on request."),
    ('>Какая минимальная длительность?<', ">What's the minimum stay?<"),
    ('Мы рекомендуем от 10 дней и больше. При бронировании от 7 дней для вас также включена диагностика здоровья по пульсу и консультация специалиста аюрведы. Но вы можете приехать на любое количество дней.',
     "We recommend a minimum of 10 days to fully benefit from the programme. However, you're welcome to stay for any number of nights — even a short stay brings real value. Stays of 7+ nights include a complimentary Ayurvedic health consultation."),
    ('>Есть ли трансфер из аэропорта?<', '>Is airport transfer available?<'),
    ('Мы организуем для вас трансфер и встретим вас в отеле (стоимость трансфера 30$).',
     'Yes, we arrange transfers and will greet you at the hotel. Transfer cost: $30.'),
    ('>Условия бронирования?<', '>What are the booking conditions?<'),
    ('Для бронирования нужно оплатить депозит в размере, эквивалентном 100$ за номер (есть разные способы оплаты). Остальное оплачивается в отеле в день заезда удобным для вас способом.',
     'A deposit of $100 per room is required to confirm your booking (multiple payment options available). The remaining balance is due on arrival. Deposits are accepted in multiple currencies and via various payment methods.'),
    ('>Нужен ли опыт йоги?<', '>Do I need yoga experience?<'),
    ('Многие наши гости — новички в йоге. Программа рассчитана на разный уровень: от начинающего до продвинутого. Преподаватели позаботятся, чтоб вам было комфортно на занятиях, и вы получили нужный результат.',
     'No experience is needed at all. Many of our guests are complete beginners. Our instructors adapt each session to individual levels — from first-timers to experienced practitioners.'),
    ('>Сколько стоит перелёт?<', '>How do I get to Koh Samui?<'),
    ('Зависит от города вылета и сезона. Напишите, когда вы хотели бы приехать и откуда летите. Мы рассчитаем примерную стоимость перелёта и поможем с билетами.',
     "Koh Samui (USM) is served by Bangkok Airways. Most international guests fly via Bangkok (BKK or DMK) or Singapore. Let us know your departure city and dates — we'll share estimated flight costs and routing options."),
    ('>Когда лучший сезон?<', '>When is the best time to visit?<'),
    ('На Самуи комфортная и приятная погода круглый год. Море около нашего отеля всегда без отливов и сильных волн. Выбирайте удобные для вас даты без привязки к сезону.',
     'Koh Samui enjoys comfortable weather year-round. The sea near our hotel is always calm, with no strong currents — perfect for swimming at any time of year. Choose the dates that suit you best.'),
    ('>Что взять с собой?<', '>What should I pack?<'),
    ('Одежда для занятий, купальник, удобная обувь для экскурсий. Дополнительные вещи сможете купить в магазинчике рядом с отелем. Коврики для йоги, пляжные полотенца есть в отеле.',
     'Lightweight yoga clothes, swimwear, and comfortable shoes for excursions. Everything else you may need is available nearby. Yoga mats and beach towels are provided by the hotel.'),
    ('>Заявка на йога-тур<', '>Book Your Yoga Retreat<'),
    ('Оставьте ваши контакты – мы свяжемся с вами, ответим на все вопросы, поможем с бронированием и перелетом.',
     "Leave your details and we'll be in touch to answer your questions, confirm availability and help you plan your journey."),
    ('Спасибо, заявка принята. Свяжемся с вами в ближайшее время.',
     "Thank you! We've received your enquiry and will be in touch shortly."),
    ('value="Йога-тур в Таиланд"', 'value="Yoga Retreat in Thailand"'),
    ('>Имя<', '>Your name<'),
    ('>Телефон / WhatsApp / MAX / Telegram<', '>Phone / WhatsApp / Telegram<'),
    ('>Код страны<', '>Country code<'),
    ('(если хотите получать от нас рассылки о скидках и акциях)', '(optional — to receive special offers and news)'),
    ('>Дата заезда <span class="yoga-form__label-hint">(необязательно)</span><', '>Arrival date <span class="yoga-form__label-hint">(optional)</span><'),
    ('>Дата выезда <span class="yoga-form__label-hint">(необязательно)</span><', '>Departure date <span class="yoga-form__label-hint">(optional)</span><'),
    ('>Комментарий (необязательно)<', '>Message (optional)<'),
    ('aria-label="Проверка «Я не робот»"', 'aria-label="Security verification"'),
    ('>политикой конфиденциальности<', '>Privacy Policy<'),
    ('>публичной офертой<', '>Terms &amp; Conditions<'),
    ('>условиями отмены бронирования<', '>Cancellation Policy<'),
    ('Я согласен с', 'I agree to the'),
    ('>Отправить заявку<', '>Send Enquiry<'),
    ('Satva Samui Retreat · Йога-тур', 'Satva Samui Retreat · Yoga Retreat, Koh Samui'),
    ('>Политика конфиденциальности<', '>Privacy Policy<'),
    ('>Публичная оферта<', '>Terms &amp; Conditions<'),
    ('>Условия отмены<', '>Cancellation Policy<'),
    ('href="/oferta.html"', 'href="#" data-open-modal="modal-offer" onclick="return false;"'),
    ('aria-label="Закрыть"', 'aria-label="Close"'),
    ('Панчакарма – глубокое очищение организма. Процедура промасливания всего тела от макушки до кончиков пальцев лекарственными маслами. Благодаря целебным смесям масел и трав, а также особой технике выполнения, процедуры оказывают обширное благоприятное влияние на здоровье человека.',
     'Panchakarma is a traditional Ayurvedic cleansing therapy involving the therapeutic application of medicated oils from head to toe. The carefully selected oil blends and herbal preparations work together to produce a profoundly beneficial effect on the body.'),
    ('Масла проникают глубоко в ткани и растворяют токсины, имеющие жирорастворимую природу, которые затем покидают организм естественным путем.',
     "The oils are absorbed deeply into the tissues, supporting the body's natural ability to release accumulated toxins — which then leave the body through its natural channels."),
    ('<strong>Во время Панчакармы очищаются:</strong>', '<strong>Panchakarma is understood to support the cleansing and rejuvenation of multiple body systems, including:</strong>'),
    ('>желудочно-кишечный тракт;<', '>the digestive tract;<'),
    ('>выделительная система организма;<', '>the lymphatic system;<'),
    ('>дыхательная система;<', '>the respiratory system;<'),
    ('>лимфа;<', '>the circulatory system;<'),
    ('>кровь;<', '>blood;<'),
    ('>костная ткань;<', '>bone tissue;<'),
    ('>нервная система;<', '>the nervous system;<'),
    ('>половая система;<', '>the reproductive system;<'),
    ('>самые тонкие каналы тела.<', ">the body's subtle energy channels.<"),
    ('Очищение происходит даже на уровне клеточных мембран и внутреннего содержимого клеток!',
     'A complete course is believed to work at a deep tissue level.'),
    ('При полном курсе 21–28 дней масло успевает достичь самых глубоких тканей организма. При более коротких курсах также будет получен благоприятный оздоровительный эффект.',
     'A full course of 21–28 days allows the oils to reach the deepest tissues. Shorter stays also offer meaningful benefits.'),
    ('Процедуры Панчакармы также благоприятно влияют на эмоциональное состояние, даруя глубокое расслабление, удовлетворенность и покой. Они снимают усталость, убирают ментальное и эмоциональное напряжение, помогают легче переносить стрессы, печали, беспокойства. Происходит естественная гармонизация тела, эмоций и психики.',
     'Many guests describe a profound sense of calm, ease and emotional clarity following Panchakarma sessions — as tension and stress are gradually released.'),
    ('>Политика конфиденциальности<', '>Privacy Policy<'),
    ('«мы») соблюдаем вашу конфиденциальность. Настоящая политика описывает, какие данные мы собираем и как их используем.',
     '«we»), your privacy matters to us. This policy describes what data we collect and how we use it.'),
    ('>1. Какие данные мы собираем<', '>1. What Data We Collect<'),
    ('При заполнении формы обратной связи мы можем получать:', 'When you submit an enquiry form, we may receive:'),
    ('>имя;<', '>your name;<'),
    ('>номер телефона (в т.ч. WhatsApp, MAX, Telegram);<', '>phone number (including WhatsApp and Telegram);<'),
    ('>email — если вы его указали в заявке.<', '>email — if you provided it in your enquiry.<'),
    ('>2. Цели использования данных<', '>2. How We Use Your Data<'),
    ('Данные используются только для связи с вами по запросу консультации или бронирования программ Satva Samui. Мы не передаём ваши данные третьим лицам для маркетинга.',
     'Your data is used solely to respond to your enquiry and assist with booking Satva Samui programmes. We do not share your data with third parties for marketing purposes.'),
    ('>3. Хранение и защита<', '>3. Storage &amp; Security<'),
    ('Мы храним персональные данные только в течение срока, необходимого для обработки запроса и ведения переписки. Принимаем разумные меры для защиты данных от несанкционированного доступа.',
     'We retain personal data only for as long as needed to process your enquiry and correspondence. We take reasonable measures to protect data from unauthorised access.'),
    ('>4. Ваши права<', '>4. Your Rights<'),
    ('Вы можете запросить доступ к своим данным, их исправление или удаление. Для этого свяжитесь с нами по контактам, указанным на сайте.',
     'You may request access to, correction of, or deletion of your data. Contact us using the details on this website. If you are in the EU/UK, you have rights under GDPR including data portability and the right to lodge a complaint with a supervisory authority.'),
    ('>5. Изменения политики<', '>5. Changes to This Policy<'),
    ('Мы можем обновлять эту политику. Актуальная версия всегда доступна на этой странице.',
     'We may update this policy from time to time. The current version is always available on this page.'),
    ('Дата последнего обновления: январь 2026.', 'Last updated: May 2026.'),
    ('>Публичная оферта<', '>Terms &amp; Conditions<'),
    ('Здесь будет полный текст публичной оферты. Satva Samui подготовит юридически согласованный документ — на этапе вёрстки используется заглушка.',
     'Full terms and conditions will be published here. Satva Samui is preparing a legally reviewed document — placeholder text is shown during development.'),
    ('Также доступна <a href="/oferta.html" target="_blank" rel="noopener noreferrer">страница оферты</a> для печати и отдельного просмотра.',
     'Contact us for a copy of our booking terms and conditions.'),
    ('<em>Текст от заказчика — май 2026.</em>', '<em>Document pending — May 2026.</em>'),
    ('>Условия отмены бронирования<', '>Cancellation Policy<'),
    ('Для бронирования номера необходим депозит&nbsp;— 100&nbsp;$ за каждый номер. Оставшуюся сумму вы оплачиваете в день приезда любым удобным способом.',
     'A deposit of $100 per room is required to confirm your reservation.'),
    ('Если вы отменяете бронирование за 14 дней и более&nbsp;— депозит остаётся на вашем счёте и действует в течение года: вы сможете использовать его при следующем визите. Перенос дат с сохранением депозита возможен один раз.',
     'If you cancel 14 or more days before your arrival date, your deposit remains valid for one year and may be applied to a future stay. Dates may be changed once without losing your deposit.'),
    ('При отмене менее чем за 14 дней до заезда депозит не сохраняется. При досрочном выезде стоимость оставшихся дней не возмещается.',
     'Cancellations within 14 days of arrival are non-refundable. Early check-outs are non-refundable for the remaining nights.'),
    ('средний рейтинг в Google —', 'average rating on Google —'),
    ('<li>препараты Аюрведы для здоровья нервов, сердца и сосудов.</li>',
     '<li>Ayurvedic herbal support for the nervous and cardiovascular system.</li>'),
    (' и <button type="button" class="js-open-yoga-cancellation', ' and <button type="button" class="js-open-yoga-cancellation'),
    ('(необязательно)', '(optional)'),
    ('Также доступна <a href="#" data-open-modal="modal-offer" onclick="return false;" target="_blank" rel="noopener noreferrer">страница оферты</a> для печати и отдельного просмотра.',
     'Contact us for a copy of our booking terms and conditions.'),
    ('aria-label="Satva Samui на Google Maps"', 'aria-label="Satva Samui on Google Maps"'),

def build_en(html: str) -> str:
    html = VK_BLOCK.sub('', html)
    html = MAX_BLOCK.sub('', html)
    html = TG_CHANNEL_BLOCK.sub('', html)
    for old, new in REPLACEMENTS:
        html = html.replace(old, new)
    html = PHONE_SELECT_PATTERN.sub(EN_PHONE_SELECT, html, count=1)
    html = PHONE_SELECT_MODAL_PATTERN.sub(EN_PHONE_SELECT_MODAL, html, count=1)
    # Fix footer offer link - use button instead of broken href
    html = html.replace(
        '<a href="#" data-open-modal="modal-offer" onclick="return false;" class="yoga-site-footer__link">Terms &amp; Conditions</a>',
        '<button type="button" class="yoga-site-footer__link js-open-yoga-offer">Terms &amp; Conditions</button>',
    )
    html = re.sub(r'"https://t\.me/OlgaSatva",\s*\n\s*\]', '"https://t.me/OlgaSatva"\n        ]', html)
    return html

en = build_en(src)
(ROOT / 'index.html').write_text(en, encoding='utf-8')
print('EN index written:', len(en), 'chars')

# sanity checks
checks = [
    ('lang="en"', 'lang en'),
    ('Yoga Retreat in Thailand', 'procedure'),
    ('Phone / WhatsApp / Telegram', 'phone label'),
    ('Most used', 'phone groups'),
    ('href="https://satvasamui.com/"', 'canonical'),
    ('vk.com', 'no vk'),
    ('max.ru', 'no max'),
    ('русскоговорящий', 'no russian guide'),
]
for needle, label in checks:
    ok = needle in en if label not in ('no vk', 'no max', 'no russian guide') else needle not in en
    print(f"  {'OK' if ok else 'FAIL'}: {label}")
