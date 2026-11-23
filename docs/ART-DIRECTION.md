# Художественное оформление Flora Keep

Сад и гербарий используют язык ботанического дневника. В саду растения получают мягкий объём, в атласе детали вынесены на чистый лист, а на театральной сцене те же силуэты выглядят как плоские бумажные вырезки. Крупные поверхности берут фактуру из своего материала. Гербарий использует бумагу, ботанический кабинет — кальку, конверт подарка — тёплый картон, а ателье — матовую глину.

Палитра интерфейса опирается на пять токенов из `src/styles/botanical-art.css`.

| Токен | Цвет | Применение |
| --- | --- | --- |
| `--flora-moss` | `#526f54` | Растительные линии и орнамент |
| `--flora-clay` | `#a96451` | Керамика и тёплые акценты |
| `--flora-linen` | `#ede5d1` | Бумажные подложки |
| `--flora-pollen` | `#c79540` | Доход и световые акценты |
| `--flora-rain` | `#587a84` | Вода и влажность |

## Иллюстрации

- Основные стебли пишутся округлой линией около трёх единиц в координатах рисунка. Прожилки, штрихи на керамике и направляющие используют более тонкую линию около одной единицы.
- Молодые листья светлее и сильнее бликуют. Стебель тяжелее листовых пластинок и его движение на ветру медленнее и мягче.
- Длинная тень зависит от положения света. Утренний и вечерний свет приходят с разных сторон. Короткая тень остаётся между горшком и поддоном.
- Погодные сцены делят рисунок на дальний пейзаж, раму и передний край. Дождевые штрихи и снег появляются за рамой. Крупные капли остаются на стекле.
- Чистый монохромный знак и лиственный орнамент годятся для печати и этикеток. Фоновые текстуры в печатном режиме убраны.
- Новые варианты иллюстрации добавляются в общий модуль `src/art.js`. Сад, мастерские и экспорт получают один набор рисунков. Идентификаторы градиентов, масок и теней уникальны в пределах каждой композиции.

## Подоконник, цианотипия и фотохроника

Для подоконника встроенный ImageGen подготовил два фона по утверждённому эскизу. В [широкой композиции](../src/assets/sill-scene.webp) сохранены диагональ тёплого света, прохладное окно и терракотовая полка. [Квадратная композиция для телефона](../src/assets/sill-scene-mobile.webp) оставляет место одному растению между кнопками листания. Комната составляет отдельный слой. Поверх него игра рисует настоящий экземпляр с его горшком и влажностью почвы.

Гербарий использует геометрию взрослого вида для светлого отпечатка. Рядом цветной рисунок показывает выбранный экземпляр в текущей стадии. В фотохронике у всех наблюдений одинаковые масштаб, горшок и свет. Так изменение силуэта можно сопоставить с записью о росте.

<details>
<summary>Запросы для двух фоновых иллюстраций</summary>

**Широкая сцена.** Edit the provided Flora Keep concept into a clean production background plate for this exact shot. Remove all text, letters, both labels, all three pots, all three plants and the plants' projected shadows. Fill in those areas with the unobstructed room. Retain the small closed notebook at the extreme lower left edge and small watering can at the extreme lower right; reduce these two props by half and push them farther into the corners so at least 80 percent horizontal shelf width is empty. Preserve the original wide 16:9 straight-on composition and the empty terracotta sill, its surface at 80–85% of image height. Preserve the strong warm gouache geometry of wide diagonal window light across moss green wall at left, cool pale muted courtyard through mullioned window on the right, painted ink and handroller grain. Soft neutral atmosphere beyond the window that suits different possible weather, without strongly visible rain strokes or snowfall. Absolutely no plants or pots on the sill; middle shelf must be vacant from edge to edge for the game to composite interactive specimens separately. No lettering or buttons. High quality color-matched 2D background in the illustrator's same style.

**Мобильная сцена.** Recompose the exact same empty painted set for a compact mobile-game window: output a SQUARE 1:1 image. Keep the terracotta sill surface on a straight horizontal line at 82% of height, beneath a composed wall left and window right (45% cool, light window and 55% golden and olive wall). Keep a small segment of the strong original diagonal honey-colored sunlight across the moss wall; importantly, cool sky and a suggested distant garden instead of detailed clutter. Handpainted gouache, original moss/umber/linen palette. Small closed journal just visible extreme lower left, very small watering can extreme lower right; leave the center 85% of shelf entirely clear for the real plant to be added by the game. No text, labels, pots, plants or flowers on or above the sill indoors. Sharp frame, tactile paint and large clean graphic planes with a clear central visual rest area. Square framing, front view, match original afternoon mood and character.

</details>
