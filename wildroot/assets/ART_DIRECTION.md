# 荒穗计划 · 温室档案美术规范

版本：BUILD 6.7，2026-10-28。

## 方向

末日里仍在工作的温室、农务 AI 和最后一袋种子。用档案纸、植物标本标签、旧黄铜仪器和修补过的农务服建立世界观。角色保留萌系和幽默感，界面保持清晰、克制；危险靠形状、预警和珊瑚红识别。

## 色彩与文字

| 用途 | 颜色 / 规范 |
| --- | --- |
| 纸色底板 | `#F4F0E2` |
| 深松绿文字与结构 | `#253F35` / `#233E34` |
| 苔绿、鼠尾草绿 | `#83A77A` / `#8CA779` |
| 黄铜、收成、稀有奖励 | `#D9B86C` |
| 珊瑚、危险、敌方弹丸 | `#C46F5B` |
| 水、冰、技术设施 | `#83B7AE` |
| 标题 | 系统宋体 / 思源宋体类衬线栈；有呼吸感，减少描边和叠影 |
| 操作与说明 | 微软雅黑 UI / 苹方等无衬线栈 |
| 编号、时长、数量 | Bahnschrift / Cascadia Mono / Consolas |

面板以 1 像素边框、3—5 像素圆角和轻阴影为主。取消彩虹渐变、白色厚边与持续弹跳。常态就绪只使用柔和呼吸；重要事件、收获和 Boss 技能才使用高对比反馈。

## 页面与信息分区

- 首页左侧展示题名、温室结构线和所选 AI 立绘，右侧展示角色、技能、武器和出发按钮；局外实验室独立打开。
- HUD 左侧为种子标签，顶部为远征与波次，底部为生命、构筑和资源，右侧为技能与临时信息。保持插件分页和商店收起功能。
- 全部覆盖界面使用 1280×720 设计坐标，经 ResizeObserver 与画布同步缩放。小窗口也保持相同的比例和布局。
- 主页面、剧情、图鉴、商店、升级、暂停、结算和 Boss 出场共用纸色档案卡、深绿底和黄铜状态标记。
- 所有种子、武器、道具、插件、实验室与技能图标使用同一 24×24 SVG 坐标与线宽体系。

## 素材与实现

| 文件 | 内容 | 接入 |
| --- | --- | --- |
| `companions-v67.png` | 小芽好奇笑、霹雳挑眉眨眼、奶泡弯眼浅笑的完整立绘 | 首页 Canvas 大立绘、角色卡和 HUD Canvas 头像、局内角色；加载完成后主动重绘 |
| `enemies-v66.png` | 9 种普通怪物与 3 名 Boss | 实际敌人、Boss 出场、已发现图鉴 |
| `crops-v66.png` | 8 种基础作物、4 种组合设施 | 成熟与生长作物、双枝杂交、组合设施、图鉴 |
| `props-v66.png` | 货郎、遗物箱、灌溉泵站、温室 | 地图设施与互动对象 |

当前四张 PNG 均由内置 imagegen 生成，保留透明 alpha 原始文件；旧 `companions-v66.png` 留作上一版素材。使用图集源矩形直接绘制，未在运行代码中逐帧读取或修改像素。角色保持直立，武器独立瞄准；怪物用左右朝向、起伏、受击高亮、冰冻色调与精英标记表现状态。局内图集未完成加载时保留程序绘制后备。

五种武器通过 `weapon-models.js` 的结构几何绘制体积：同一套模型用于菜单与局内；顶面、侧面、枪口、握柄与手部按层绘制，加入后坐、枪机、泵动、线圈脉冲、悬浮核心与镰刃挥砍。六类野外设施采用相同色板与细描边，分别为桶、交换机、种子柜、旧终端、修理桌和授粉风铃，附统一图标、菱形地图标记、费用和使用状态。

粒子采用叶片、花粉点、短火星、双层冲击环和有内缘的镰刀弧；友方弹丸使用带尾迹的种子轮廓，敌弹使用珊瑚外壳与浅色核心。地图色彩与草斑降饱和，农田改用旧木与土色，避免抢过人物、植物和危险预警。

发布时 `scripts/build-public.py` 将样式、脚本和图集打包进单个 HTML；公开试玩无需额外请求素材域名。源文件本地运行仍直接使用 `assets/` 文件夹。

## 最终生成提示词集

以下为本轮使用内置 imagegen 的最终素材提示词核心规格；完整的主题、对象、布局、透明度和避让规则均保留，便于后续延续风格。

### 角色图集 / stylized-concept

BUILD 6.7 编辑源：`companions-v66.png`；最终输出：`companions-v67.png`（1536×1024，RGBA）。内置 imagegen 编辑提示词如下：

Edit the provided transparent three-character atlas for the Wildroot cute post-apocalyptic farming roguelite. Preserve the exact THREE equal-width vertical columns, full-body figures, existing character identities, clothing, jade/ivory/brass/coral palette, leafy accessories, relative scale, baseline and hand-painted premium 2D cel finish. Keep true transparent background. Improve facial craftsmanship and make the three faces conspicuously different, not the same face with a hair change. LEFT Sprout: softly rounded face, large bright curious amber eyes with different-sized glints, relaxed gently raised eyebrows, small open smile showing delight at a seedling, warm cheek blush, one tiny beauty mark below her left eye. CENTER Beat: more angular lively face, one eye confidently WINKING shut and the other slightly narrowed golden eye, clearly asymmetrical raised eyebrow, playful sideways grin with ONE small visible canine tooth, energetic cocky personality. RIGHT Mochi: round soft cheeks, BOTH eyes relaxed crescent-shaped nearly closed smiling eyes, small CLOSED contented smile, delicate blush and three tiny freckles on each cheek, tranquil caring personality. These expressions must be easily differentiated even when scaled down. Give faces cleaner eyelids, coherent mouth shapes, natural blush, subtle warm shading and readable fine details. Improve collar seams, hair locks and hand anatomy without clutter. Do not give them identical eye or mouth shapes. Do not add weapons, text, icons, borders, shadows, scenery or extra characters. Each entire figure stays fully inside its existing third, with generous margins and no overlap. Transparent alpha must be preserved. Atlas intended for full-body menu portrait and in-game character source.

原 BUILD 6.6 基础图集提示词：

Production-ready transparent character sprite atlas for a polished cute post-apocalyptic farming roguelite browser game, titled Wildroot. One horizontal atlas with exactly three equally sized vertical cells, left center right. Each third contains one complete full-body character, centered, same scale and baseline, generous empty margins, no cropping or overlaps. Truly transparent background; no text, labels, scene or cast shadow. Premium indie game 2D hand-painted cel illustration with crisp dark evergreen outlines, large expressive faces, restrained detail, 2.5-head chibi proportions, three-quarter front view facing slightly right. Matte shading, warm ivory highlights; cohesive muted jade, warm coral, honey brass and charcoal palette. Left Sprout: dusty rose bob, small leafy pigtails, sprout antenna, jade field jacket, ivory dress, dark boots, brass seed satchel, tiny teal collar LED, holding a seedling. Center Beat: copper-orange twin tufts, brass headphones, coral utility jacket, dark moss shorts, cream scarf, battery backpack, confident expression, lightning hairclip. Right Mochi: fluffy mint bob with round side locks, ivory and sage raincoat, coral first-aid satchel, jade boots, small pale cyan shield ornament, gentle face. Clear dark eyes, blush and tiny mouth; identical finishing quality. Avoid glossy 3D, neon, noise and photorealism.

### 怪物图集 / stylized-concept

Production game sprite atlas, exactly twelve isolated cute post-apocalyptic farm monsters in a uniform four-column by three-row grid. Transparent square canvas with true alpha; creatures centered fully within their cells, ample margins, no text, shadows or overlap. Cohesive premium indie hand-painted 2D cel style: dark evergreen outlines, matte softly shaded surfaces, readable chunky silhouettes and expressive faces; muted moss, sage, ivory, ochre brass and earthy coral. Three-quarter front view slightly right. First row: rust-coral six-legged root beetle with striped abdomen and antennae; sage and muted plum seed-spitting spore flower with leafy petals; moss wild boar with ivory tusks and overgrown back armor; honey wasp with translucent cream wings and stinger. Second row: olive squash-shaped leech with sleepy eyes and vine tail; anxious pinkish bloated mushroom with pale nodules; rust-orange masked seed thief carrying a canvas sack; pale jade healer cactus with medical-cross flower and first-aid pouch. Third row: broken teal farm robot with mismatched eyes and cables; charcoal-green crowned crow king with brass leaf crown and red chest crystal; sage gelatinous slime boss with rusty irrigation pump inside its belly; ancient corrupted wooden root tyrant with thick root limbs, wheat crown, amber eyes and seed crystal. Ordinary creatures share moderate scale, bosses slightly larger. No UI, grid lines, lettering, neon, realism or gore.

### 作物图集 / stylized-concept

Production sprite atlas, twelve plants in a separated four-column by three-row grid on a transparent square image. Entire objects centered inside cells, generous transparent margins, no labels, ground, shadows or UI. Premium hand-painted 2D cel art, dark evergreen outlines, subtle matte paint texture, sage foliage, warm ivory highlights, honey brass, earthy coral and dusty blue; expressive little faces, three-quarter front view. First row: upright curved coral chili on broad leaves; golden twelve-petal smiling sunflower; rounded sage pea-shooter head and tubular cannon mouth on two-leaf base; teal horseshoe magnetic mushroom with ivory stalk and brass terminals. Second row: pale cyan crystalline ice mushroom; twin mauve and ivory mimic mushrooms; tan determined walnut with bark seam; golden corn catapult plant with kernels and curled husks. Third row: twin thick pea barrels on brass-green tracked carriage; double sunflower solar tower with brass focusing mirror and leafy pedestal; pepper and ice mushroom inside two connected glass-brass reactor chambers with a steam curl; giant golden corn cannon on wooden wheels and brass bands with leaf supports. Plants compact and readable, facilities larger but clean. Exactly twelve objects; no extra plants, captions, white background, neon or realism.

### 场景互动图集 / stylized-concept

Production transparent square prop atlas with exactly four fully separated objects in a strict two-by-two grid. Ample transparent margins, no text, ground, shadow or UI. Same premium indie hand-painted 2D cel art, dark evergreen outlines, matte soft shading, paperlike paint detail, muted moss and sage, ivory, honey brass and earthy coral, three-quarter front view. Top left: friendly rotund farm robot merchant with cream ceramic face, amber eyes, patched leafy straw hat, sage apron, brass joints, standing beside a wooden two-wheel seed cart with ivory seed packets, rolled map and brass leaf charm. Top right: closed brass and dark walnut relic chest with leaf lock, pale green seed crystal and botanical engraving. Bottom left: reclaimed moss-green irrigation tank with brass pipes, wheel valve, old pump spout, cyan water-level glass and little leaves. Bottom right: abandoned glass greenhouse with sage arched frame, cracked ivory-tinted translucent panels, wooden base, leafy vines, honey-gold flowers, open door and brass lamp. Entire objects stay inside quadrants. No extra objects, overlaps, realism, neon or 3D.
