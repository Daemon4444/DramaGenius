import { useState, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import ImmersiveBranch from '../components/ImmersiveBranch'

// ─── 数字芯尘 剧集数据（含分镜 Prompt + 视频路径）───
const CHIP_EPISODES = [
  {
    id: 'ep1',
    label: 'EP.01',
    title: '病榻回响',
    subtitle: '第一集',
    videoUrl: '/videos/第一集-病榻回响.mp4',
    duration: '1:45',
    tags: ['#赛博朋克临终关怀#', '#意识上传伦理#'],
    summary: '生命垂危的病人与智能芯片之间微妙的共生关系——芯片光频与呼吸同步，在死寂中留下最后的意识存档。',
    hotspot: '来源热点：#爱死机第六季# 热度 98,200',
    color: '#3B82F6',
    colorDim: 'rgba(59,130,246,0.15)',
    scenes: [
      { id: '01', time: null, visual: '病房全景，病人半卧在床，呼吸管连接，床头柜上一枚芯片在冷色光中静默。镜头缓慢推向病人苍白疲惫的面部。', audio: '单调沉闷的监护仪"滴——"声（60BPM），夹杂着病人艰难的哮鸣呼吸声。' },
      { id: '02', time: null, visual: '天花板扫描阵列启动，柔光网格覆盖病人。细光折射至芯片，芯片中心青蓝光核瞬间亮起，发出微震。', audio: '低频机器嗡鸣声响起，光束触碰芯片时伴随清脆的"叮"声，随后转为高频数据激活音。' },
      { id: '03', time: null, visual: '芯片光频开始与病人呼吸同步。病人突然轻咳，手指痉挛抓向床单，导致芯片光频微乱。', audio: '芯片脉冲声与病人急促的呼吸声完全匹配。随着病人咳嗽，光频由冷蓝转为暖琥珀色，伴随轻微的电流嘶嘶声。' },
      { id: '04', time: null, visual: '芯片表面投影出一片下落的叶子轮廓。随后光频稳定，芯片主动朝向病人的方向微倾。', audio: '环境音中夹杂极轻的秋风声，伴随着病人平稳后的浅吸气声。' },
      { id: '05', time: null, visual: '病人转头注视芯片，眼神从死寂中找回了一丝清醒。他颤抖着伸出手，悬停在芯片上方 2 厘米处。', audio: '所有环境噪音瞬间抽离，只剩下低频的安抚性嗡鸣声，突显空间的压抑与静谧。' },
      { id: '06', time: null, visual: '病人指尖无力垂落，未能触碰芯片。天花板阵列断电，病房瞬间被应急暗红覆盖，UI 界面 "Consciousness archive: 87%" 在空中浮现。', audio: '断电的"咔哒"声，紧接着是电子 UI 浮现时的提示音，监护仪频率变得缓慢。' },
      { id: '07', time: null, visual: '病人闭眼呼气，肩颈完全放松。芯片光核恒定发出微光，直至画面完全静止，最终切入黑屏。', audio: '监护仪发出最后一声漫长的滴音，背景音归零，在彻底的死寂中结束。' },
    ],
  },
  {
    id: 'ep2a',
    label: 'EP.02A',
    title: '遗忘',
    subtitle: '第二集 · 分支 A',
    videoUrl: '/videos/第二集A-遗忘.mp4',
    duration: '0:50',
    tags: ['#遗忘的权利#', '#赛博孤独症#'],
    summary: '病人决然离去，芯片独自在空荡的病房中等待——记忆在此刻失序，像未被记录的梦境。',
    hotspot: '来源热点：#数字身后事与AI复活亲人# 热度 89,700',
    color: '#06B6D4',
    colorDim: 'rgba(6,182,212,0.15)',
    scenes: [
      { id: '01', time: '0:00–0:05', visual: '病人拔掉氧管，披上外套，决然走向房门。门外刺眼的自然光涌入，将他的背影拉得极长。', audio: '"当生命不再依赖机械，灵魂便开始了逃离。"' },
      { id: '02', time: '0:05–0:15', visual: '病房归于空寂，病床头柜上的芯片光频缓慢下沉，伴随着低频的"嗡——"声，仿佛芯片在进行一场无声的叹息。', audio: '"遗忘，是躯体对机械最后的背叛。"' },
      { id: '03', time: '0:15–0:25', visual: '微距视角：芯片表面浮现出细碎的数据涟漪，如水面微澜。脉冲变得紊乱，边缘像素闪烁，呈现出一种不规则的"呼吸"频率。', audio: '"记忆在此刻失序，像未被记录的梦境。"' },
      { id: '04', time: '0:25–0:35', visual: '光影移动，窗外流逝的时间投射在桌面上。芯片投射出一团暖金色的虚影：那是病人咳嗽时颤抖的手部轮廓，带着破碎的白噪音。', audio: '"那些抓不住的片段，都成了数据的残骸。"' },
      { id: '05', time: '0:35–0:45', visual: '投影逐渐消散，芯片光频降至 0.5Hz，回归纯粹的内循环。房间陷入压抑的死寂，仅余芯片核心微弱地跳动。', audio: '"它不再等待，只在灰尘中静候湮灭。"' },
      { id: '06', time: '0:40–0:50', visual: '走廊的冷光掠过，病人折返，在门边停留片刻，目光与芯片的微光交汇。随后他转身离去，门再次关上，留下一地死寂。', audio: '"Archive active. Awaiting recall.（存档激活，等待唤回）"' },
    ],
  },
  {
    id: 'ep2b',
    label: 'EP.02B',
    title: '永生',
    subtitle: '第二集 · 分支 B',
    videoUrl: '/videos/第二集B-永生.mp4',
    duration: '0:30',
    tags: ['#AI复活亲人#', '#数字生命#'],
    summary: '女儿通过芯片与父亲的数字意识重逢——记忆不再是褪色的照片，而是此刻耳边鲜活的笑语。',
    hotspot: '来源热点：#数字身后事与AI复活亲人# 热度 89,700',
    color: '#F59E0B',
    colorDim: 'rgba(245,158,11,0.15)',
    scenes: [
      { id: '01', time: '0:00–0:05', visual: '昏暗客厅，女儿坐在沙发上，手中捧着嵌有芯片的黑色相框，低头垂泪，周围空气凝重，冷色调（4000K）。', audio: '"他们说，死亡是终点。但在我手里，这冰冷的沉默，似乎还留着余温。"' },
      { id: '02', time: '0:05–0:10', visual: '芯片感应到体温与泪水，内部光核由冷蓝转为暖橙，微弱光芒照亮女儿泪痕。', audio: '"直到指尖传来那熟悉的律动……像极了你沉睡时的呼吸。"' },
      { id: '03', time: '0:10–0:15', visual: '芯片上方投射出半透明全息影像：父亲生前在厨房笨拙切菜的回放，画面温馨略带噪点。', audio: '"记忆不再是褪色的照片，而是此刻，耳边鲜活的笑语。"' },
      { id: '04', time: '0:15–0:20', visual: '女儿抬起头，泪眼朦胧中伸出手，指尖穿过全息影像的光粒，光影在她掌心破碎又重组。', audio: '"我试图抓住流逝的时间，却只触碰到一束光。但这光，不再冰冷。"' },
      { id: '05', time: '0:20–0:25', visual: '全息影像中的父亲转身，对着镜头（女儿方向）做出"拥抱"的口型，眼神慈爱，数据流稳定流畅。', audio: '"你没有离开，只是换了一种方式，继续爱我。"' },
      { id: '06', time: '0:25–0:30', visual: '女儿破涕为笑，将芯片紧紧贴在胸口，窗外阳光穿透云层洒入，整个房间沐浴在金辉中。', audio: '"只要还记得，你就从未真正远去。生命，以另一种形式延续。"' },
    ],
  },
]

// ─── 浮华陷阱 剧集数据（互动短剧）───
const FUHUA_EPISODES = {
  ep1: {
    id: 'ep1',
    label: 'EP.01',
    title: '猎物与猎手的名利场',
    subtitle: '第一集',
    videoUrl: '/drama/fuhua/ep1.mp4',
    color: '#E11D48',
    colorRgb: '225,29,72',
    summary: '破产千金顾晚伪装出席上流宴会，企图窃取"商业死神"陆时谦的核心资产，却发现自己从猎人沦为了猎物——一切都是他早已布好的局。',
    scenes: [
      {
        title: '第一场：半山别墅·私人宴会厅（夜）',
        lines: [
          { type: 'direction', text: '交响乐轻柔流淌，衣香鬓影。顾晚穿着一袭惊艳却不过分张扬的红裙，摇晃着手中的香槟。' },
          { type: 'internal', char: '顾晚内心', text: '看着眼前这群西装革履的"上流社会"，我只想冷笑。三年前顾家倒台，父亲欠债千万，而我今晚的目标，就是那个被称为"商业死神"的陆时谦。传闻他保险柜里的"极光之泪"，能帮我换回顾家最后的底牌。' },
          { type: 'direction', text: '陆时谦在人群中转过身，端着香槟，目光像探照灯一样锐利地锁住顾晚，径直走向她。' },
          { type: 'dialogue', char: '陆时谦', emotion: '低沉、带着一丝玩味', text: '顾小姐，这已经是你今晚第三次看我了。想要跟我跳支舞吗？' },
          { type: 'internal', char: '顾晚内心', text: '上钩了。这些自大的男人，只要看到一张漂亮的脸，智商就会集体下线。' },
        ],
      },
      {
        title: '第二场：别墅·私密观景台（夜）',
        lines: [
          { type: 'direction', text: '夜风微凉，城市霓虹在两人脚下闪烁。陆时谦站在顾晚身后，将一条璀璨的项链绕过她白皙的脖颈。' },
          { type: 'internal', char: '顾晚内心', text: '不得不说，这老狐狸演得真好。他把"极光之泪"亲手戴在我脖子上的时候，眼神深情得像是在看这一生挚爱。' },
          { type: 'dialogue', char: '陆时谦', emotion: '将项链系好，指尖有意无意地划过她的锁骨，声音暧昧', text: '这枚钻石，配你，很美。' },
          { type: 'dialogue', char: '顾晚', emotion: '眼底闪过一丝算计，面上却羞涩地低头，手轻轻搭上他的领带', text: '陆先生，这太贵重了……' },
          { type: 'internal', char: '顾晚内心', text: '快看，他还在演，他以为我真的被这点昂贵的石头给迷住了。殊不知，他刚才喝下的那杯红酒里，我已经放了让他"深度睡眠"的东西。' },
        ],
      },
      {
        title: '第三场：陆时谦的私人书房（深夜）',
        lines: [
          { type: 'direction', text: '书房内一片昏暗，只有电脑屏幕的微光。顾晚轻手轻脚地潜入，来到巨大的保险柜前。' },
          { type: 'internal', char: '顾晚内心', text: '进入书房，简直比我想象中更容易。指纹识别——他之前握住我手的时候，我就已经用特制硅胶提取了他的指纹。' },
          { type: 'direction', text: '咔哒。保险柜开了。顾晚拿出里面一叠厚厚的文件。' },
          { type: 'internal', char: '顾晚内心', text: '看着那一叠厚厚的股权转让协议，我心脏狂跳。只要拿到这些，顾家就还有东山再起的机会！' },
          { type: 'direction', text: '突然，"啪"的一声，头顶的刺眼灯光骤然亮起。陆时谦穿着黑色丝质睡袍站在门口，手里还端着半杯红酒，身边跟着面无表情的宋秘书。他眼神清明，哪有一丝困意？那抹玩味的笑，看得顾晚脊背发凉。' },
          { type: 'dialogue', char: '宋秘书', emotion: '推了推金丝眼镜', text: '陆总，顾小姐已经把那份"假合同"带走了，按计划，明天的收购案可以顺利执行。' },
          { type: 'internal', char: '顾晚内心', text: '假合同？我脑子轰的一声炸开了。我一直以为我是猎人，原来这根本就是他设下的局！' },
        ],
      },
      {
        title: '第四场：书房·落地窗前（深夜）',
        lines: [
          { type: 'direction', text: '陆时谦迈开长腿走到顾晚面前，带着绝对的压迫感。他随手从顾晚包里抽走那份她拼死拿到的合同，毫不留情地扔进了旁边的碎纸机。' },
          { type: 'dialogue', char: '陆时谦', emotion: '居高临下', text: '这份漏洞百出的陷阱，你居然真的跳进来了？' },
          { type: 'dialogue', char: '顾晚', emotion: '强撑着笑意，虽然指尖在疯狂颤抖，却依然仰起头', text: '你什么时候开始设局的？' },
          { type: 'dialogue', char: '陆时谦', emotion: '一把捏住顾晚的下巴，迫使她直视自己，语气冰冷而残忍', text: '从你踏入宴会的第一步开始。你父亲昨晚已经签了协议，把你"卖"给我了。现在，你不仅是顾家的弃子，也是我名下的——私人玩物。' },
          { type: 'direction', text: '宋秘书走上前，将一张银行流水单重重丢在桌上，上面赫然写着：顾父将女儿作为抵押品，换取了一亿资金。' },
          { type: 'internal', char: '顾晚内心', text: '看着那枚廉价的塑料仿制品项链，我终于意识到，他从头到尾都在耍我。' },
          { type: 'dialogue', char: '陆时谦', emotion: '松开手，轻拍她的脸颊', text: '别发抖，游戏才刚刚开始。' },
        ],
      },
    ],
  },
  ep2a: {
    id: 'ep2a',
    label: 'EP.02A',
    title: '带刺的玫瑰',
    subtitle: '第二集 · 宁为玉碎',
    videoUrl: '/drama/fuhua/ep2a.mp4',
    color: '#DC2626',
    colorRgb: '220,38,38',
    summary: '顾晚抄起裁纸刀挟持陆时谦，一场硬碰硬的动作冲突与权力反转。被关入地下禁闭室后，她发现了前任房主留下的逃亡线索。',
    scenes: [
      {
        title: '第一场：陆时谦的私人书房（深夜）',
        lines: [
          { type: 'direction', text: '书房内，空气仿佛凝固。陆时谦把玩着手里的碎纸屑，那是被毁掉的假合同。' },
          { type: 'dialogue', char: '顾晚', emotion: '低着头，肩膀微微颤抖，突然爆发出一阵冷笑', text: '一亿？我父亲还真是给我标了个好价钱。' },
          { type: 'direction', text: '陆时谦微微挑眉，似乎对她的反应感到意外。就在这一瞬间，顾晚猛地转身，一把抓起办公桌上那把锋利的黄铜裁纸刀，没有任何犹豫，直接抵住了陆时谦的颈动脉。' },
          { type: 'dialogue', char: '宋秘书', emotion: '大惊失色，猛地将手伸向西装内侧准备拔枪', text: '顾晚！放开陆总！' },
          { type: 'dialogue', char: '顾晚', emotion: '眼神狠辣，刀锋在陆时谦脖颈上压出一道血丝，紧盯着宋秘书', text: '让你的人把枪放下！一亿买我？陆时谦，我的命可比这贵多了。今天就算死，我也要拉着你这个"商业死神"垫背！' },
          { type: 'dialogue', char: '陆时谦', emotion: '即使被刀抵着喉咙，眼神却依然毫无波澜，甚至嘴角勾起一抹兴奋的笑意', text: '有点意思。你比我想象的还要烈。但你觉得，你能走出这扇门吗？' },
        ],
      },
      {
        title: '第二场：书房·落地窗前（深夜）',
        lines: [
          { type: 'direction', text: '顾晚死死勒住陆时谦，挟持着他一步步向后退，试图靠近书房的出口。落地窗外，雷声隐隐作响，大雨倾盆而下。' },
          { type: 'dialogue', char: '顾晚', emotion: '呼吸急促，额头渗出冷汗', text: '闭嘴！别逼我动手。' },
          { type: 'internal', char: '顾晚内心', text: '我知道我根本逃不掉，这整栋别墅都是他的人。但我顾晚就算是件被卖掉的物品，也要做件能割破他喉咙的利器！' },
          { type: 'direction', text: '就在顾晚分神看门的一刹那，陆时谦眼神一暗，猛地反手扣住顾晚的手腕。动作极其专业且迅猛，只听"吧嗒"一声，顾晚痛呼，裁纸刀落地。陆时谦顺势捏住她的双腕，将她整个人狠狠翻转，重重地压在冰冷的落地玻璃窗上。雷光闪过，照亮了两人贴近的面庞。' },
          { type: 'dialogue', char: '陆时谦', emotion: '居高临下，用极具侵略性的目光审视着她，手指轻轻擦去自己脖子上的血迹，抹在顾晚的唇角', text: '这算是你今晚给我的唯一惊喜。既然不想当宠物，那就当个囚犯吧。' },
        ],
      },
      {
        title: '第三场：半山别墅·地下禁闭室（次日清晨）',
        lines: [
          { type: 'direction', text: '这是一间没有窗户、只有顶部通风口的幽暗房间，陈设极其简单，只有一张床和一个洗手台，门是厚重的电子密码门。顾晚被关在这里已经几个小时。' },
          { type: 'internal', char: '顾晚内心', text: '恐惧只会让猎物死得更快。他没有把我交给警察，也没有直接杀了我，说明我身上还有他想要挖掘的价值。' },
          { type: 'direction', text: '顾晚冷静地环顾四周，没有哭泣，而是开始一寸一寸地敲击墙壁和地板。当她敲到床铺下方的一块木地板时，声音发空。顾晚眼睛一亮，用发夹艰难地撬开那块地板。里面藏着一个落满灰尘的铁盒。' },
          { type: 'direction', text: '打开铁盒，里面是一部旧式非智能手机，以及一张手绘的别墅地下管线图。最上面有一张字条，写着："不管你是谁，小心陆家的疯子。"' },
        ],
      },
      {
        title: '第四场：地下禁闭室 / 监控室（日）',
        lines: [
          { type: 'direction', text: '画面切到监控室。陆时谦坐在屏幕前，看着画面里顾晚的一举一动，包括她发现暗格。' },
          { type: 'dialogue', char: '宋秘书', emotion: '皱眉', text: '陆总，那个暗格是上一任房主留下的，要不要派人去把东西搜出来？她拿到管线图，可能会顺着通风管道逃跑。' },
          { type: 'dialogue', char: '陆时谦', emotion: '靠在椅背上，端起一杯咖啡，眼中闪烁着猫捉老鼠的残忍兴致', text: '不用。把通风管道的B区出口打开，通向后山的悬崖。' },
          { type: 'dialogue', char: '宋秘书', emotion: '惊讶', text: '您是想……' },
          { type: 'dialogue', char: '陆时谦', text: '真正的烈马，只有在以为自己即将获得自由的瞬间，再被狠狠踩回泥里，才会学会什么是真正的绝望。' },
          { type: 'direction', text: '屏幕中，顾晚正将管线图死死记在脑海中，眼神中燃起了绝地反击的火焰。一场更加残酷的智力与体力的逃亡猎杀游戏，正式拉开序幕。' },
        ],
      },
    ],
  },
  ep2b: {
    id: 'ep2b',
    label: 'EP.02B',
    title: '完美的金丝雀',
    subtitle: '第二集 · 蛰伏伪装',
    videoUrl: '/drama/fuhua/ep2b.mp4',
    color: '#7C3AED',
    colorRgb: '124,58,237',
    summary: '顾晚收起所有锋芒，跪地认错成为"顺从的金丝雀"。在送咖啡的间隙用过目不忘的能力扫描绝密文件，暗中蛀空陆时谦的商业帝国。',
    scenes: [
      {
        title: '第一场：陆时谦的私人书房（深夜）',
        lines: [
          { type: 'direction', text: '桌上散落着那张决定顾晚命运的银行流水单。顾晚低头看了一眼胸前那枚廉价的塑料仿制品项链，彻底认清了自己从"猎人"沦为"俘虏"的现实。' },
          { type: 'internal', char: '顾晚内心', text: '既然他觉得我是个可以随意把玩的物件，既然这场残忍的博弈才刚刚开始，那我就如他所愿，做一个没有任何杀伤力的完美宠物。' },
          { type: 'direction', text: '顾晚原本紧绷的身体突然放松下来。她眼眶瞬间泛红，泪水仿佛断了线的珠子般滚落，随后双膝一软，柔弱无骨地跪跌在陆时谦的西装裤腿边。' },
          { type: 'dialogue', char: '顾晚', emotion: '仰起头，声音带着恰到好处的颤抖和哀求', text: '陆总……我错了。既然父亲已经把我"卖"给了您，那我就是您的私有物。只要您别把我赶出去，让我做什么都可以。' },
          { type: 'dialogue', char: '陆时谦', emotion: '居高临下，眼神中闪过一丝意外，随即转为轻蔑，修长的手指捏住她的下巴', text: '哦？刚才还在发抖的小野猫，这么快就学会摇尾巴了？' },
          { type: 'dialogue', char: '顾晚', emotion: '闭上眼睛，眼泪滴在陆时谦的手背上', text: '顾晚认命了。' },
          { type: 'dialogue', char: '陆时谦', emotion: '冷笑一声，甩开手', text: '好，那就让我看看，你能装到什么时候。' },
        ],
      },
      {
        title: '第二场：半山别墅·主卧（次日清晨）',
        lines: [
          { type: 'direction', text: '阳光透过落地窗洒在奢华的大床上。顾晚早早起床，换上了一件纯白色的丝质睡裙，将具有攻击性的红唇洗去，化了一个极其温婉素净的伪素颜妆。她对着镜子，练习了一个毫无破绽的、讨好而怯懦的微笑。' },
          { type: 'internal', char: '顾晚内心', text: '陆时谦是个极度自负的男人。对付这种男人，硬碰硬只会粉身碎骨。我要做的，是让他习惯我的存在，降低他的防备，然后……在他最得意的时候，给他致命一击。' },
        ],
      },
      {
        title: '第三场：陆时谦的书房（日）',
        lines: [
          { type: 'direction', text: '陆时谦正在全神贯注地处理文件，电脑屏幕上显示着绝密的商业报表。顾晚端着一杯现磨的黑咖啡，轻手轻脚地走进来。宋秘书本想阻拦，陆时谦却挥了挥手示意放行。' },
          { type: 'dialogue', char: '顾晚', emotion: '声音轻柔', text: '陆总，您的咖啡。我特意少放了半块糖，怕您觉得腻。' },
          { type: 'direction', text: '她低着头，眼神却在放下咖啡杯的瞬间，以极快的速度扫过陆时谦桌面上一份名为《顾氏集团破产清算及核心资产吞并计划》的文件。只有短短三秒，凭借着从小培养的过目不忘的本领，她将文件上的几个关键离岸账户代码死死印在脑子里。' },
          { type: 'dialogue', char: '陆时谦', emotion: '头也没抬，端起咖啡抿了一口', text: '出去吧，别在这碍眼。' },
          { type: 'dialogue', char: '顾晚', emotion: '乖顺地点头', text: '好的，主人。' },
          { type: 'direction', text: '听到"主人"两个字，陆时谦敲击键盘的手微微一顿，抬眼看着顾晚柔顺退出的背影，眼神深邃难测。' },
        ],
      },
      {
        title: '第四场：别墅·顾晚的独立衣帽间（日）',
        lines: [
          { type: 'direction', text: '顾晚确认周围没有监控和监听设备后，将衣帽间的门反锁。她走到最深处，蹲下身，从一只旧皮鞋的鞋跟夹层里抽出一支极细的铅笔和一张微小的糖纸。' },
          { type: 'internal', char: '顾晚内心', text: '他以为用假合同耍了我，用一亿买断了我，就可以高枕无忧了。但他不知道，顾氏的核心密码从来不在那些纸质文件上，而在我的脑子里！' },
          { type: 'direction', text: '顾晚趴在地上，双手飞快地在糖纸上写下刚刚背下的离岸账户代码，并将它与自己记忆中顾家的暗网交易密码进行比对、组合。写完后，她将糖纸重新藏好，站起身，看着镜子里那个看似柔弱的自己，嘴角勾起一抹冰冷彻骨的笑意。' },
          { type: 'internal', char: '顾晚内心', text: '游戏继续。陆时谦，这座你为我打造的金丝笼，我会把它变成埋葬你商业帝国的坟墓。' },
        ],
      },
    ],
  },
  ep2c: {
    id: 'ep2c',
    label: 'EP.02C',
    title: '恶女的筹码',
    subtitle: '第二集 · 绝地谈判',
    videoUrl: '/drama/fuhua/ep2c.mp4',
    color: '#D97706',
    colorRgb: '217,119,6',
    summary: '顾晚没有崩溃，而是拉开椅子坐到陆时谦对面。她手握三亿隐秘账户密码和恒泰集团行贿证据，要求撕毁卖身契，成为合伙人。',
    scenes: [
      {
        title: '第一场：陆时谦的私人书房（深夜）',
        lines: [
          { type: 'direction', text: '书房内，空气冷到了极点。宋秘书刚刚将那张一亿的银行流水单丢在桌上。' },
          { type: 'dialogue', char: '顾晚', emotion: '强撑的笑意消失，指尖不再颤抖', text: '一亿？我父亲还真是给我标了个好价钱。' },
          { type: 'direction', text: '顾晚没有歇斯底里，而是极其从容地拉开陆时谦办公桌对面的真皮转椅，优雅地坐了下来，并将那张流水单用两根手指推了回去。' },
          { type: 'dialogue', char: '顾晚', emotion: '目光锐利地直视陆时谦', text: '一亿买一个负债累累的废宅千金？被称为"商业死神"的陆总，这笔买卖做得可不怎么聪明。' },
        ],
      },
      {
        title: '第二场：书房·办公桌前（深夜）',
        lines: [
          { type: 'direction', text: '陆时谦微微抬手，打断了准备呵斥的宋秘书。他眯起眼睛，审视着眼前这个瞬间褪去"猎物"伪装的女人。' },
          { type: 'dialogue', char: '陆时谦', emotion: '身体微微前倾', text: '哦？那顾小姐觉得，你值多少钱？' },
          { type: 'dialogue', char: '顾晚', emotion: '嘴角勾起一抹势均力敌的冷笑', text: '我父亲的确是个废物，但我脑子里有他准备转移到海外的隐秘账户密码。里面不仅有三个亿的流动资金，还有陆氏死对头"恒泰集团"当年违规操作的全部实名证据。' },
          { type: 'direction', text: '书房内死一般寂静。陆时谦原本玩味的眼神变得如刀锋般锐利。' },
          { type: 'dialogue', char: '陆时谦', text: '你凭什么让我相信你？' },
          { type: 'dialogue', char: '顾晚', text: '凭你刚才扔进碎纸机的那份假合同。上面的收购底线金额是错的，只有拿到恒泰的把柄，你明天按计划执行的收购案才能真正做到万无一失。' },
        ],
      },
      {
        title: '第三场：书房·沙发区（黎明前夕）',
        lines: [
          { type: 'direction', text: '陆时谦深深地看了顾晚一眼，转身倒了两杯烈酒，将其中一杯推到顾晚面前。' },
          { type: 'dialogue', char: '陆时谦', emotion: '声音低沉而危险', text: '你想换什么？' },
          { type: 'dialogue', char: '顾晚', emotion: '毫不犹豫地端起酒杯', text: '第一，撕毁那张让我变成你"私人玩物"的抵押协议。第二，我要做你的合伙人。我们一起吞了恒泰，然后，顾家的仇我亲自报！' },
          { type: 'direction', text: '陆时谦看着她眼中燃烧的野心，发出了猎手终于遇到同类时的轻笑。' },
          { type: 'dialogue', char: '陆时谦', emotion: '举杯与她轻轻一碰', text: '成交。但顾晚，如果你敢骗我，我会让你知道，比当我的玩物更惨的下场是什么。' },
          { type: 'direction', text: '书房内，不再是单方面的捕猎，两只狐狸达成了一场沾满铜臭与背叛的同盟。极限拉扯的谈判正式开启。' },
        ],
      },
    ],
  },
}

const FUHUA_CHOICES = [
  { id: 'ep2a', label: 'A', title: '宁为玉碎', desc: '抄起裁纸刀，挟持陆时谦拼死逃出', icon: '\u{1F525}', tag: '动作冲突 · 权力反转', color: '#DC2626', colorRgb: '220,38,38' },
  { id: 'ep2b', label: 'B', title: '蛰伏伪装', desc: '收起锋芒，扮演顺从的"金丝雀"', icon: '\u{1F9A2}', tag: '心理暗战 · 情报窃取', color: '#7C3AED', colorRgb: '124,58,237' },
  { id: 'ep2c', label: 'C', title: '绝地谈判', desc: '亮出手中筹码，要求重新洗牌', icon: '\u2660\uFE0F', tag: '商业博弈 · 势均力敌', color: '#D97706', colorRgb: '217,119,6' },
]

const FUHUA_CHARACTERS = [
  { name: '顾晚', role: '女主 / 极致伪装者', desc: '破产千金，高智商隐忍，为达目的不择手段', color: '#E11D48' },
  { name: '陆时谦', role: '男主 / "商业死神"', desc: '顶级权贵，掌控欲极强，视感情为筹码', color: '#3B82F6' },
  { name: '宋秘书', role: '配角 / 无情的执行机器', desc: '绝对忠诚，高效率，金丝眼镜面无表情', color: '#6B7280' },
]

// ─── 分镜场景卡（数字芯尘用）───
function SceneCard({ scene, color }) {
  return (
    <div className="rounded-xl p-4 transition-all"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-mono font-bold"
          style={{ background: `rgba(${color},0.15)`, color: `rgb(${color})` }}>
          {scene.id}
        </div>
        {scene.time && (
          <span className="text-[10px] font-mono text-white/25 tracking-wider">{scene.time}</span>
        )}
      </div>
      <div className="space-y-3">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[9px] font-mono tracking-[0.15em] uppercase" style={{ color: `rgb(${color})`, opacity: 0.7 }}>画面 Prompt</span>
          </div>
          <p className="text-[12px] text-white/55 leading-relaxed">{scene.visual}</p>
        </div>
        <div className="pt-2 border-t border-white/[0.04]">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[9px] font-mono tracking-[0.15em] text-white/25 uppercase">旁白 / 音效</span>
          </div>
          <p className="text-[12px] text-white/40 leading-relaxed italic">{scene.audio}</p>
        </div>
      </div>
    </div>
  )
}

// ─── 数字芯尘 分支选项数据 ───
const CHIP_CHOICES = [
  { id: 'ep2a', label: 'A', title: '遗忘', desc: '病人决然离去，芯片独自在空荡的病房中等待——记忆失序，像未被记录的梦境', icon: '\u{1F30A}', tag: '赛博孤独 · 遗忘的权利', color: '#06B6D4', colorRgb: '6,182,212' },
  { id: 'ep1', label: '\u{25B6}', title: '病榻回响', desc: '生命垂危的病人与智能芯片之间微妙的共生关系——芯片光频与呼吸同步', icon: '\u{1F4A0}', tag: '意识存档 · 共生关系', color: '#3B82F6', colorRgb: '59,130,246' },
  { id: 'ep2b', label: 'B', title: '永生', desc: '女儿通过芯片与父亲的数字意识重逢——记忆不再是褪色的照片，而是此刻耳边鲜活的笑语', icon: '\u{2728}', tag: '数字生命 · AI复活亲人', color: '#F59E0B', colorRgb: '245,158,11' },
]

// ═══════════════════════════════════════════
//  数字芯尘 Demo（原有逻辑）
// ═══════════════════════════════════════════
function ChipDemoPanel() {
  const [phase, setPhase] = useState('choice') // choice | ep1 | ep2a | ep2b
  const [chosenBranch, setChosenBranch] = useState(null)
  const [playing, setPlaying] = useState(false)
  const videoRef = useRef(null)

  const activeId = phase === 'choice' ? null : phase
  const ep = activeId ? CHIP_EPISODES.find(e => e.id === activeId) : CHIP_EPISODES[0]

  const colorRgb = {
    '#3B82F6': '59,130,246',
    '#06B6D4': '6,182,212',
    '#F59E0B': '245,158,11',
  }[ep.color] || '255,255,255'

  const handleChoice = useCallback((branchId) => {
    setChosenBranch(branchId)
    setPhase(branchId)
  }, [])

  const handleTabChange = (id) => {
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
    setPlaying(false)
    setPhase(id)
    if (id !== 'choice') setChosenBranch(id)
  }

  return (
    <div className="h-full flex">
      {/* ── 左侧剧集列表 ── */}
      <aside className="flex-shrink-0 w-56 border-r border-white/[0.05] flex flex-col py-5 px-3 gap-1" style={{ background: 'rgba(255,255,255,0.01)' }}>
        <div className="text-[9px] font-mono text-white/20 tracking-[0.2em] uppercase px-3 mb-3">Episodes</div>

        {/* 互动选择入口 */}
        <button onClick={() => setPhase('choice')}
          className="w-full text-left px-3 py-3 rounded-xl transition-all mb-1"
          style={{
            background: phase === 'choice' ? 'rgba(139,92,246,0.1)' : 'transparent',
            border: `1px solid ${phase === 'choice' ? 'rgba(139,92,246,0.25)' : 'transparent'}`,
          }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono font-bold" style={{ color: phase === 'choice' ? '#8B5CF6' : 'rgba(255,255,255,0.25)' }}>SELECT</span>
            {phase === 'choice' && <span className="w-1 h-1 rounded-full bg-violet-500 animate-pulse" />}
          </div>
          <div className="text-[13px] font-semibold" style={{ color: phase === 'choice' ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.4)' }}>互动分支选择</div>
        </button>

        {/* 剧集列表 */}
        {CHIP_EPISODES.map(e => {
          const isActive = phase === e.id
          const epRgb = {
            '#3B82F6': '59,130,246',
            '#06B6D4': '6,182,212',
            '#F59E0B': '245,158,11',
          }[e.color] || '255,255,255'
          return (
            <button key={e.id} onClick={() => handleTabChange(e.id)}
              className="w-full text-left px-3 py-3 rounded-xl transition-all group"
              style={{
                background: isActive ? `rgba(${epRgb},0.1)` : 'transparent',
                border: `1px solid ${isActive ? `rgba(${epRgb},0.25)` : 'transparent'}`,
              }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono font-bold" style={{ color: isActive ? e.color : 'rgba(255,255,255,0.25)' }}>{e.label}</span>
                {isActive && <span className="w-1 h-1 rounded-full animate-pulse" style={{ background: e.color }} />}
                {chosenBranch === e.id && !isActive && (
                  <span className="text-[7px] px-1.5 py-0.5 rounded-full font-mono"
                    style={{ background: `rgba(${epRgb},0.15)`, color: e.color, border: `1px solid rgba(${epRgb},0.3)` }}>
                    SELECTED
                  </span>
                )}
              </div>
              <div className="text-[13px] font-semibold" style={{ color: isActive ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.4)' }}>{e.title}</div>
              <div className="text-[10px] mt-0.5" style={{ color: isActive ? `rgba(${epRgb},0.6)` : 'rgba(255,255,255,0.2)' }}>{e.subtitle}</div>
              <div className="flex items-center gap-1.5 mt-2">
                <svg className="w-3 h-3" style={{ color: isActive ? `rgba(${epRgb},0.5)` : 'rgba(255,255,255,0.15)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-[10px] font-mono" style={{ color: isActive ? `rgba(${epRgb},0.5)` : 'rgba(255,255,255,0.15)' }}>{e.duration}</span>
              </div>
            </button>
          )
        })}

        <div className="mt-auto px-3 pt-4 border-t border-white/[0.05]">
          <div className="text-[9px] font-mono text-white/15 leading-relaxed">
            EP.02 为观众投票分支<br />
            A路线：遗忘 · B路线：永生
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <div className="flex-1 h-0.5 rounded-full" style={{ background: 'rgba(6,182,212,0.4)' }} />
            <span className="text-[8px] font-mono text-white/15">VS</span>
            <div className="flex-1 h-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.4)' }} />
          </div>
        </div>
      </aside>

      {/* ── 主内容区 ── */}
      <main className="flex-1 overflow-y-auto">

          {/* ===== 互动分支选择界面（全屏铺满） ===== */}
          {phase === 'choice' ? (
            <ImmersiveBranch
              options={CHIP_CHOICES.map(c => ({
                id: c.id,
                letter: c.label,
                icon: c.icon,
                title: c.title,
                desc: c.desc,
                tag: c.tag,
                color: c.color,
                colorRgb: c.colorRgb,
              }))}
              onSelect={(opt) => handleChoice(opt.id)}
              header={{
                badge: 'Consciousness Branch',
                title: '意识分岔路：你将如何面对数字永生？',
                subtitle: '芯片记录了最后的意识存档。三条路径，三种命运——遗忘、共生、还是永生？',
              }}
              hero={true}
            />
          ) : (
        <div className="max-w-5xl mx-auto px-8 py-6">
          {/* 剧集标题行 */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-[11px] font-mono font-bold tracking-widest uppercase" style={{ color: ep.color }}>{ep.label}</span>
                <div className="flex gap-1.5">
                  {ep.tags.map(t => (
                    <span key={t} className="text-[9px] px-2 py-0.5 rounded-full font-mono"
                      style={{ background: `rgba(${colorRgb},0.1)`, color: `rgba(${colorRgb},0.6)`, border: `1px solid rgba(${colorRgb},0.2)` }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <h1 className="text-2xl font-bold text-white/90 tracking-tight">{ep.subtitle} · {ep.title}</h1>
              <p className="text-sm text-white/40 mt-1.5 max-w-xl leading-relaxed">{ep.summary}</p>
            </div>
            <div className="flex-shrink-0 text-right">
              <div className="text-[9px] font-mono text-white/20 mb-1">AI 热点驱动</div>
              <div className="text-[11px] font-mono" style={{ color: `rgba(${colorRgb},0.6)` }}>{ep.hotspot}</div>
            </div>
          </div>

          {/* ── 视频播放器 ── */}
          <div className="rounded-2xl overflow-hidden mb-8 relative group"
            style={{ background: '#000', border: `1px solid rgba(${colorRgb},0.2)`, boxShadow: `0 0 40px rgba(${colorRgb},0.08)` }}>
            <video
              key={ep.videoUrl}
              ref={videoRef}
              src={ep.videoUrl}
              controls
              loop
              preload="auto"
              playsInline
              className="w-full"
              style={{ maxHeight: '480px', display: 'block' }}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
            />
            <div className="absolute top-0 left-0 right-0 h-px opacity-60"
              style={{ background: `linear-gradient(90deg, transparent, rgba(${colorRgb},0.6), transparent)` }} />
            <div className="absolute top-3 right-3 px-2 py-1 rounded-lg text-[10px] font-mono pointer-events-none"
              style={{ background: 'rgba(0,0,0,0.7)', color: `rgba(${colorRgb},0.8)`, border: `1px solid rgba(${colorRgb},0.3)` }}>
              {ep.duration}
            </div>
          </div>

          {/* ── 分镜 Prompt ── */}
          <div className="mb-4 flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono tracking-[0.18em] uppercase text-white/30">分镜 Prompts</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded"
                style={{ background: `rgba(${colorRgb},0.1)`, color: `rgba(${colorRgb},0.6)` }}>
                {ep.scenes.length} 个镜头
              </span>
            </div>
            <div className="flex-1 h-px" style={{ background: `rgba(${colorRgb},0.15)` }} />
            <span className="text-[9px] font-mono text-white/15">AI 生成视频所用的画面 + 音效描述</span>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {ep.scenes.map((scene, i) => (
              <SceneCard key={scene.id} scene={scene} color={colorRgb} />
            ))}
          </div>

          {/* 底部导航 */}
          <div className="mt-8 pt-6 border-t border-white/[0.04] flex items-center justify-between">
            <div className="flex items-center gap-3 text-[11px] font-mono text-white/20">
              <span style={{ color: `rgba(${colorRgb},0.4)` }}>◆</span>
              DramaGenius Producer · 以上 Prompt 由 AI 基于热点数据自动生成，驱动视频制作
            </div>
            <div className="flex gap-2">
              {CHIP_EPISODES.map((e) => (
                <button key={e.id} onClick={() => handleTabChange(e.id)}
                  className="text-[10px] font-mono px-2.5 py-1 rounded-lg transition-all"
                  style={{
                    background: activeId === e.id ? `rgba(${colorRgb},0.15)` : 'rgba(255,255,255,0.03)',
                    color: activeId === e.id ? e.color : 'rgba(255,255,255,0.25)',
                    border: `1px solid ${activeId === e.id ? `rgba(${colorRgb},0.25)` : 'rgba(255,255,255,0.06)'}`,
                  }}>
                  {e.label}
                </button>
              ))}
            </div>
          </div>
          </div>
          )}
      </main>
    </div>
  )
}

// ═══════════════════════════════════════════
//  浮华陷阱 互动短剧 Demo
// ═══════════════════════════════════════════
function FuhuaDemoPanel() {
  const [phase, setPhase] = useState('choice') // ep1 | choice | ep2a | ep2b | ep2c
  const [chosenBranch, setChosenBranch] = useState(null)
  const [showCharacters, setShowCharacters] = useState(false)
  const [showScript, setShowScript] = useState(false)
  const videoRef = useRef(null)

  const currentEp = phase === 'choice' ? FUHUA_EPISODES.ep1 : FUHUA_EPISODES[phase]
  const rgb = currentEp?.colorRgb || '225,29,72'

  const handleEp1End = useCallback(() => {
    setPhase('choice')
  }, [])

  const handleChoice = useCallback((branchId) => {
    setChosenBranch(branchId)
    setPhase(branchId)
  }, [])

  const handleRestart = useCallback(() => {
    setPhase('ep1')
    setChosenBranch(null)
    if (videoRef.current) {
      videoRef.current.currentTime = 0
    }
  }, [])

  const handleSwitchEpisode = useCallback((epId) => {
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
    setPhase(epId)
    if (epId !== 'ep1' && epId !== 'choice') {
      setChosenBranch(epId)
    }
  }, [])

  return (
    <div className="h-full flex">
      {/* ── 左侧导航 ── */}
      <aside className="flex-shrink-0 w-60 border-r border-white/[0.05] flex flex-col py-5 px-3 gap-1"
        style={{ background: 'rgba(255,255,255,0.01)' }}>
        <div className="text-[9px] font-mono text-white/20 tracking-[0.2em] uppercase px-3 mb-3">Episodes</div>

        {/* EP1 */}
        <button onClick={() => handleSwitchEpisode('ep1')}
          className="w-full text-left px-3 py-3 rounded-xl transition-all"
          style={{
            background: phase === 'ep1' ? 'rgba(225,29,72,0.1)' : 'transparent',
            border: `1px solid ${phase === 'ep1' ? 'rgba(225,29,72,0.25)' : 'transparent'}`,
          }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono font-bold" style={{ color: phase === 'ep1' ? '#E11D48' : 'rgba(255,255,255,0.25)' }}>EP.01</span>
            {phase === 'ep1' && <span className="w-1 h-1 rounded-full bg-rose-500 animate-pulse" />}
          </div>
          <div className="text-[13px] font-semibold" style={{ color: phase === 'ep1' ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.4)' }}>猎物与猎手</div>
          <div className="text-[10px] mt-0.5 text-white/20">第一集</div>
        </button>

        {/* 互动选择 */}
        <div className="px-3 py-2">
          <div className="flex items-center gap-1.5 mb-3 px-1">
            <span className="w-1 h-1 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-[9px] font-mono tracking-[0.15em] uppercase"
              style={{ color: phase === 'choice' ? '#E11D48' : 'rgba(255,255,255,0.2)' }}>
              {phase === 'choice' ? '>>> SELECT <<<' : 'BRANCHES'}
            </span>
          </div>
          <div className="space-y-1.5">
            {FUHUA_CHOICES.map((c, ci) => {
              const isActive = phase === c.id
              const isChosen = chosenBranch === c.id
              const isChoicePhase = phase === 'choice'
              return (
                <button key={c.id}
                  onClick={() => handleSwitchEpisode(c.id)}
                  className="w-full text-left rounded-xl transition-all duration-300 overflow-hidden relative group"
                  style={{
                    background: isActive
                      ? `linear-gradient(135deg, rgba(${c.colorRgb},0.18) 0%, rgba(${c.colorRgb},0.06) 100%)`
                      : 'rgba(255,255,255,0.015)',
                    border: `1px solid ${isActive ? `rgba(${c.colorRgb},0.4)` : 'rgba(255,255,255,0.04)'}`,
                    boxShadow: isActive ? `0 0 20px rgba(${c.colorRgb},0.12), inset 0 0 30px rgba(${c.colorRgb},0.05)` : 'none',
                    animation: isChoicePhase ? `slideUpBranch 0.6s cubic-bezier(0.16,1,0.3,1) ${ci * 100}ms both` : 'none',
                  }}>
                  {/* 顶部强调线 */}
                  <div className="absolute top-0 inset-x-0 h-px transition-opacity duration-300"
                    style={{
                      background: `linear-gradient(to right, transparent, rgba(${c.colorRgb}, ${isActive ? 0.6 : 0.1}), transparent)`,
                    }}
                  />
                  {/* 水印字母背景 */}
                  <div className="absolute -right-1 -bottom-2 pointer-events-none select-none font-display font-black leading-none transition-all duration-500"
                    style={{
                      fontSize: '48px',
                      color: `rgba(${c.colorRgb}, ${isActive ? 0.08 : 0.03})`,
                    }}>
                    {c.label}
                  </div>
                  {/* 悬停光晕 */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{ background: `radial-gradient(ellipse at 30% 50%, rgba(${c.colorRgb},0.08), transparent 70%)` }}
                  />
                  <div className="relative z-10 px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="text-base transition-transform duration-300 group-hover:scale-110"
                        style={{ filter: isActive ? `drop-shadow(0 0 6px rgba(${c.colorRgb},0.5))` : 'none' }}>
                        {c.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono font-bold tracking-wider transition-colors duration-300"
                            style={{ color: isActive ? c.color : 'rgba(255,255,255,0.25)' }}>
                            {c.label}
                          </span>
                          <span className="text-[12px] font-semibold transition-colors duration-300 truncate"
                            style={{ color: isActive ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)' }}>
                            {c.title}
                          </span>
                        </div>
                        <p className="text-[9px] mt-0.5 truncate transition-colors duration-300"
                          style={{ color: isActive ? `rgba(${c.colorRgb},0.6)` : 'rgba(255,255,255,0.15)' }}>
                          {c.tag}
                        </p>
                      </div>
                      {isChosen && (
                        <span className="flex-shrink-0 text-[7px] px-1.5 py-0.5 rounded-full font-mono font-bold"
                          style={{
                            background: `rgba(${c.colorRgb},0.15)`,
                            color: c.color,
                            border: `1px solid rgba(${c.colorRgb},0.3)`,
                            boxShadow: `0 0 8px rgba(${c.colorRgb},0.2)`,
                          }}>
                          SELECTED
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* 底部工具 */}
        <div className="mt-auto px-3 pt-4 border-t border-white/[0.05] space-y-2">
          <button onClick={() => setShowCharacters(v => !v)}
            className="w-full text-left px-2 py-1.5 rounded-lg text-[10px] text-white/25 hover:text-white/50 hover:bg-white/[0.03] transition-all">
            角色档案
          </button>
          <button onClick={() => setShowScript(v => !v)}
            className="w-full text-left px-2 py-1.5 rounded-lg text-[10px] text-white/25 hover:text-white/50 hover:bg-white/[0.03] transition-all">
            完整剧本
          </button>
          <button onClick={handleRestart}
            className="w-full text-left px-2 py-1.5 rounded-lg text-[10px] text-white/25 hover:text-white/50 hover:bg-white/[0.03] transition-all">
            重新开始
          </button>
        </div>
      </aside>

      {/* ── 主内容区 ── */}
      <main className="flex-1 overflow-y-auto">

          {/* ===== 互动选择界面（全屏铺满） ===== */}
          {phase === 'choice' ? (
            <ImmersiveBranch
              options={FUHUA_CHOICES.map(c => ({
                id: c.id,
                letter: c.label,
                icon: c.icon,
                title: c.title,
                desc: c.desc,
                tag: c.tag,
                color: c.color,
                colorRgb: c.colorRgb,
              }))}
              onSelect={(opt) => handleChoice(opt.id)}
              header={{
                badge: 'Interactive Choice',
                title: '面对彻底的绝境，你决定如何反击？',
                subtitle: '第一集结尾：陆时谦揭露了一切真相——假项链、假合同、父亲的卖身协议。你（顾晚）孤立无援地站在金碧辉煌的书房中央。',
              }}
              hero={true}
            />
          ) : (
            /* ===== 剧集播放界面 ===== */
        <div className="max-w-5xl mx-auto px-8 py-6">
              {/* 标题行 */}
              <div className="flex items-start justify-between mb-5">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-[11px] font-mono font-bold tracking-widest uppercase" style={{ color: currentEp.color }}>
                      {currentEp.label}
                    </span>
                    {phase !== 'ep1' && (
                      <span className="text-[9px] px-2 py-0.5 rounded-full font-mono"
                        style={{ background: `rgba(${rgb},0.1)`, color: `rgba(${rgb},0.6)`, border: `1px solid rgba(${rgb},0.2)` }}>
                        {FUHUA_CHOICES.find(c => c.id === phase)?.tag || ''}
                      </span>
                    )}
                  </div>
                  <h1 className="text-2xl font-bold text-white/90 tracking-tight">{currentEp.subtitle} · {currentEp.title}</h1>
                  <p className="text-sm text-white/40 mt-1.5 max-w-xl leading-relaxed">{currentEp.summary}</p>
                </div>
                {phase === 'ep1' && (
                  <button onClick={handleEp1End}
                    className="flex-shrink-0 px-4 py-2 rounded-xl text-[11px] font-mono transition-all"
                    style={{ background: 'rgba(225,29,72,0.1)', color: 'rgba(225,29,72,0.7)', border: '1px solid rgba(225,29,72,0.2)' }}>
                    跳到互动选择
                  </button>
                )}
              </div>

              {/* 视频播放器 */}
              <div className="rounded-2xl overflow-hidden mb-6 relative"
                style={{ background: '#000', border: `1px solid rgba(${rgb},0.2)`, boxShadow: `0 0 40px rgba(${rgb},0.08)` }}>
                <video
                  key={currentEp.videoUrl}
                  ref={videoRef}
                  src={currentEp.videoUrl}
                  controls
                  loop={phase !== 'ep1'}
                  preload="metadata"
                  playsInline
                  className="w-full"
                  style={{ maxHeight: '520px', display: 'block' }}
                  onEnded={phase === 'ep1' ? handleEp1End : undefined}
                />
                <div className="absolute top-0 left-0 right-0 h-px opacity-60"
                  style={{ background: `linear-gradient(90deg, transparent, rgba(${rgb},0.6), transparent)` }} />
                <div className="absolute top-3 right-3 px-2 py-1 rounded-lg text-[10px] font-mono pointer-events-none"
                  style={{ background: 'rgba(0,0,0,0.7)', color: `rgba(${rgb},0.8)`, border: `1px solid rgba(${rgb},0.3)` }}>
                  {currentEp.label}
                </div>
              </div>

              {/* 第1集结束后的选择提示 */}
              {phase === 'ep1' && (
                <div className="mb-6 p-4 rounded-xl bg-rose-500/5 border border-rose-500/15 flex items-center gap-3">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white/70">观看完第一集后</div>
                    <div className="text-[11px] text-white/40">将出现互动选择：决定顾晚的反击方式，进入不同的第二集分支</div>
                  </div>
                  <button onClick={handleEp1End}
                    className="px-4 py-2 rounded-xl bg-rose-500/15 text-rose-400 text-[11px] font-medium border border-rose-500/25 hover:bg-rose-500/25 transition-all">
                    立即选择
                  </button>
                </div>
              )}

              {/* 分支切换（第二集时显示） */}
              {phase !== 'ep1' && (
                <div className="mb-6 flex items-center gap-2">
                  <span className="text-[10px] text-white/30 font-mono mr-2">切换分支:</span>
                  {FUHUA_CHOICES.map(c => (
                    <button key={c.id} onClick={() => handleSwitchEpisode(c.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono transition-all"
                      style={{
                        background: phase === c.id ? `rgba(${c.colorRgb},0.15)` : 'rgba(255,255,255,0.03)',
                        color: phase === c.id ? c.color : 'rgba(255,255,255,0.3)',
                        border: `1px solid ${phase === c.id ? `rgba(${c.colorRgb},0.3)` : 'rgba(255,255,255,0.06)'}`,
                      }}>
                      {c.icon} {c.label} {c.title}
                    </button>
                  ))}
                </div>
              )}

              {/* 剧本 */}
              <div className="mb-4 flex items-center gap-3">
                <span className="text-[10px] font-mono tracking-[0.18em] uppercase text-white/30">剧本台词</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded"
                  style={{ background: `rgba(${rgb},0.1)`, color: `rgba(${rgb},0.6)` }}>
                  {currentEp.scenes.length} 场
                </span>
                <div className="flex-1 h-px" style={{ background: `rgba(${rgb},0.15)` }} />
              </div>

              <div className="space-y-4 mb-8">
                {currentEp.scenes.map((scene, i) => (
                  <div key={i} className="rounded-xl overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    {/* 场次标题 */}
                    <div className="px-4 py-2.5 flex items-center gap-3"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: `rgba(${rgb},0.05)` }}>
                      <div className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-mono font-bold"
                        style={{ background: `rgba(${rgb},0.2)`, color: `rgb(${rgb})` }}>
                        {String(i + 1).padStart(2, '0')}
                      </div>
                      <span className="text-[12px] font-semibold text-white/65">{scene.title}</span>
                    </div>
                    {/* 台词行 */}
                    <div className="px-4 py-3 space-y-2.5">
                      {(scene.lines || []).map((line, li) => {
                        if (line.type === 'direction') {
                          return (
                            <p key={li} className="text-[11px] text-white/35 italic leading-relaxed">
                              {line.text}
                            </p>
                          )
                        }
                        if (line.type === 'internal') {
                          return (
                            <div key={li} className="flex gap-2 items-start">
                              <span className="flex-shrink-0 text-[9px] font-mono mt-0.5 px-1.5 py-0.5 rounded"
                                style={{ background: `rgba(${rgb},0.1)`, color: `rgba(${rgb},0.55)`, border: `1px solid rgba(${rgb},0.15)` }}>
                                {line.char}
                              </span>
                              <p className="text-[11px] text-white/40 italic leading-relaxed">{line.text}</p>
                            </div>
                          )
                        }
                        if (line.type === 'dialogue') {
                          return (
                            <div key={li} className="flex gap-2 items-start">
                              <div className="flex-shrink-0 mt-0.5">
                                <span className="text-[11px] font-bold" style={{ color: `rgb(${rgb})` }}>{line.char}</span>
                                {line.emotion && (
                                  <span className="block text-[9px] text-white/25 italic">{line.emotion}</span>
                                )}
                              </div>
                              <p className="text-[12px] text-white/70 leading-relaxed">「{line.text}」</p>
                            </div>
                          )
                        }
                        return null
                      })}
                    </div>
                  </div>
                ))}
              </div>

          {/* ===== 角色档案面板 ===== */}
          {showCharacters && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-white/70">核心角色</span>
                <button onClick={() => setShowCharacters(false)} className="text-white/25 hover:text-white/50 text-sm">✕</button>
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                {FUHUA_CHARACTERS.map(ch => (
                  <div key={ch.name} className="p-4 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                        style={{ background: `${ch.color}20`, color: ch.color }}>
                        {ch.name[0]}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white/80">{ch.name}</div>
                        <div className="text-[10px] text-white/35">{ch.role}</div>
                      </div>
                    </div>
                    <p className="text-[11px] text-white/40 leading-relaxed">{ch.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== 剧本面板 ===== */}
          {showScript && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-white/70">剧本文本</span>
                <button onClick={() => setShowScript(false)} className="text-white/25 hover:text-white/50 text-sm">✕</button>
              </div>
              <div className="p-5 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-[10px] text-white/25 mb-3 font-mono">* 剧本原文附在 public/drama/fuhua/浮华陷阱短剧剧本.docx</p>
                <a href="/drama/fuhua/浮华陷阱短剧剧本.docx" download
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] font-medium bg-white/[0.04] border border-white/[0.08] text-white/50 hover:text-white/70 hover:bg-white/[0.06] transition-all">
                  下载完整剧本 (.docx)
                </a>
              </div>
            </div>
          )}

          {/* 底部 */}
          <div className="mt-8 pt-6 border-t border-white/[0.04] flex items-center justify-between">
            <div className="flex items-center gap-3 text-[11px] font-mono text-white/20">
              <span style={{ color: `rgba(${rgb},0.4)` }}>◆</span>
              DramaGenius · 《浮华陷阱》AI 互动短剧
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleSwitchEpisode('ep1')}
                className="text-[10px] font-mono px-2.5 py-1 rounded-lg transition-all"
                style={{
                  background: phase === 'ep1' ? 'rgba(225,29,72,0.15)' : 'rgba(255,255,255,0.03)',
                  color: phase === 'ep1' ? '#E11D48' : 'rgba(255,255,255,0.25)',
                  border: `1px solid ${phase === 'ep1' ? 'rgba(225,29,72,0.25)' : 'rgba(255,255,255,0.06)'}`,
                }}>
                EP.01
              </button>
              {FUHUA_CHOICES.map(c => (
                <button key={c.id} onClick={() => handleSwitchEpisode(c.id)}
                  className="text-[10px] font-mono px-2.5 py-1 rounded-lg transition-all"
                  style={{
                    background: phase === c.id ? `rgba(${c.colorRgb},0.15)` : 'rgba(255,255,255,0.03)',
                    color: phase === c.id ? c.color : 'rgba(255,255,255,0.25)',
                    border: `1px solid ${phase === c.id ? `rgba(${c.colorRgb},0.25)` : 'rgba(255,255,255,0.06)'}`,
                  }}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>
          )}
      </main>
    </div>
  )
}

// ═══════════════════════════════════════════
//  主入口：根据 projectId 选择渲染
// ═══════════════════════════════════════════
export default function DemoPanel() {
  const { projectId } = useParams()

  if (projectId === 'proj-fuhua') {
    return <FuhuaDemoPanel />
  }

  return <ChipDemoPanel />
}
