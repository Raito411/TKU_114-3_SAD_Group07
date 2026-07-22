from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "use_case_diagram.png"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        "/System/Library/Fonts/PingFang.ttc",
        "/System/Library/Fonts/STHeiti Light.ttc",
        "/System/Library/Fonts/STHeiti Medium.ttc",
        "/Library/Fonts/Arial Unicode.ttf",
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size=size, index=1 if bold else 0)
        except OSError:
            continue
    return ImageFont.load_default()


def center_text(draw, xy, text, fnt, fill=(36, 42, 54), spacing=4):
    x1, y1, x2, y2 = xy
    lines = text.split("\n")
    heights = []
    widths = []
    for line in lines:
        box = draw.textbbox((0, 0), line, font=fnt)
        widths.append(box[2] - box[0])
        heights.append(box[3] - box[1])
    total_h = sum(heights) + spacing * (len(lines) - 1)
    y = y1 + ((y2 - y1) - total_h) / 2
    for line, width, height in zip(lines, widths, heights):
        draw.text((x1 + ((x2 - x1) - width) / 2, y), line, font=fnt, fill=fill)
        y += height + spacing


def line(draw, a, b, fill=(86, 96, 112), width=3):
    draw.line([a, b], fill=fill, width=width)


def connector(draw, points, fill=(86, 96, 112), width=2):
    draw.line(points, fill=fill, width=width, joint="curve")


def dashed_connector(draw, points, fill=(143, 155, 179), width=2, dash=16, gap=10):
    for a, b in zip(points, points[1:]):
        x1, y1 = a
        x2, y2 = b
        length = ((x2 - x1) ** 2 + (y2 - y1) ** 2) ** 0.5
        if length == 0:
            continue
        dx = (x2 - x1) / length
        dy = (y2 - y1) / length
        step = 0
        while step < length:
            end = min(step + dash, length)
            draw.line(
                (
                    x1 + dx * step,
                    y1 + dy * step,
                    x1 + dx * end,
                    y1 + dy * end,
                ),
                fill=fill,
                width=width,
            )
            step += dash + gap


def junction(draw, center, radius=6, fill=(86, 96, 112)):
    x, y = center
    draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=fill)


W, H = 1960, 1240
img = Image.new("RGB", (W, H), "#f7f8fb")
draw = ImageDraw.Draw(img)

title_font = font(38, True)
subtitle_font = font(22)
label_font = font(22, True)
uc_font = font(21)
small_font = font(17)
SHIFT_Y = -85


def shift_point(point):
    x, y = point
    return (x, y + SHIFT_Y)


def shift_box(box):
    x1, y1, x2, y2 = box
    return (x1, y1 + SHIFT_Y, x2, y2 + SHIFT_Y)

draw.text((60, 42), "校內二手書面交預約系統 - 使用案例圖", font=title_font, fill="#18202f")
draw.text((62, 92), "依 0708 Project Charter v2 與 0714 需求文件整理，不新增未提及角色或功能", font=subtitle_font, fill="#586174")

system_box = (390, 150, 1545, 1120)
draw.rounded_rectangle(system_box, radius=26, outline="#4263eb", width=4, fill="#ffffff")
draw.text((system_box[0] + 28, system_box[1] + 22), "系統邊界", font=label_font, fill="#243b86")

actors = {
    "買方學生": (155, 455),
    "學生使用者": (155, 980),
    "非交易當事人": (1785, 360),
    "賣方學生": (1785, 680),
    "系統管理員": (1785, 960),
}
actors = {name: shift_point(center) for name, center in actors.items()}


def draw_actor(name, center):
    x, y = center
    draw.ellipse((x - 28, y - 72, x + 28, y - 16), outline="#2f3a4f", width=4, fill="#ffffff")
    draw.line((x, y - 16, x, y + 62), fill="#2f3a4f", width=4)
    draw.line((x - 56, y + 10, x + 56, y + 10), fill="#2f3a4f", width=4)
    draw.line((x, y + 62, x - 46, y + 128), fill="#2f3a4f", width=4)
    draw.line((x, y + 62, x + 46, y + 128), fill="#2f3a4f", width=4)
    box = draw.textbbox((0, 0), name, font=label_font)
    draw.text((x - (box[2] - box[0]) / 2, y + 142), name, font=label_font, fill="#18202f")


for actor_name, actor_center in actors.items():
    draw_actor(actor_name, actor_center)

use_cases = {
    "UC-01\n搜尋二手書": (520, 380, 790, 490),
    "UC-02\n查看書籍詳細資料": (520, 545, 820, 655),
    "UC-03\n送出或取消購買需求": (520, 710, 840, 825),
    "UC-04\n刊登、折扣設定與\n編輯二手書": (985, 380, 1320, 510),
    "UC-05\n管理購買要求與\n面交安排": (985, 575, 1320, 705),
    "UC-07\n以刊登序號管理\n交易狀態": (985, 765, 1320, 895),
    "UC-09\n註冊並登入學生帳號": (520, 970, 840, 1080),
    "UC-06\n查看交易狀態與\n信箱通知": (890, 930, 1190, 1060),
    "UC-08\n標記交易失敗與\n處理停權": (1260, 930, 1535, 1060),
}
use_cases = {name: shift_box(box) for name, box in use_cases.items()}


def ellipse_mid(box):
    x1, y1, x2, y2 = box
    return ((x1 + x2) / 2, (y1 + y2) / 2)


for text, box in use_cases.items():
    draw.ellipse(box, fill="#eef4ff", outline="#4263eb", width=3)
    center_text(draw, box, text, uc_font)

links = [
    ("買方學生", "UC-01\n搜尋二手書"),
    ("買方學生", "UC-02\n查看書籍詳細資料"),
    ("買方學生", "UC-03\n送出或取消購買需求"),
    ("買方學生", "UC-06\n查看交易狀態與\n信箱通知"),
    ("賣方學生", "UC-04\n刊登、折扣設定與\n編輯二手書"),
    ("賣方學生", "UC-05\n管理購買要求與\n面交安排"),
    ("賣方學生", "UC-06\n查看交易狀態與\n信箱通知"),
    ("賣方學生", "UC-07\n以刊登序號管理\n交易狀態"),
    ("賣方學生", "UC-08\n標記交易失敗與\n處理停權"),
    ("學生使用者", "UC-06\n查看交易狀態與\n信箱通知"),
    ("學生使用者", "UC-09\n註冊並登入學生帳號"),
    ("系統管理員", "UC-08\n標記交易失敗與\n處理停權"),
    ("非交易當事人", "UC-02\n查看書籍詳細資料"),
]

association_paths = [
    ("買方學生", "UC-01\n搜尋二手書", [(233, 500), (340, 500), (340, 435), (520, 435)]),
    ("買方學生", "UC-02\n查看書籍詳細資料", [(340, 600), (520, 600)]),
    ("買方學生", "UC-03\n送出或取消購買需求", [(340, 768), (520, 768)]),
    ("學生使用者", "UC-09\n註冊並登入學生帳號", [(233, 1025), (520, 1025)]),
    ("學生使用者", "UC-06\n查看交易狀態與\n信箱通知", [(233, 1025), (360, 1025), (360, 1170), (1040, 1170), (1040, 1060)]),
    ("非交易當事人", "UC-02\n查看書籍詳細資料", [(1707, 405), (1450, 405), (1450, 600), (820, 600)]),
    ("賣方學生", "UC-04\n刊登、折扣設定與\n編輯二手書", [(1707, 725), (1320, 445)]),
    ("賣方學生", "UC-05\n管理購買要求與\n面交安排", [(1707, 725), (1320, 640)]),
    ("賣方學生", "UC-07\n以刊登序號管理\n交易狀態", [(1707, 725), (1320, 830)]),
    ("賣方學生", "UC-08\n標記交易失敗與\n處理停權", [(1707, 725), (1510, 725), (1510, 995), (1535, 995)]),
    ("系統管理員", "UC-08\n標記交易失敗與\n處理停權", [(1707, 1005), (1535, 995)]),
]
association_paths = [
    (actor, use_case, [shift_point(point) for point in points])
    for actor, use_case, points in association_paths
]

for _, _, points in association_paths:
    connector(draw, points, width=2)

connector(draw, [shift_point(point) for point in [(340, 435), (340, 768)]], width=2)
junction(draw, shift_point((340, 435)))
junction(draw, shift_point((340, 600)))
junction(draw, shift_point((340, 768)))
junction(draw, shift_point((360, 1025)))

dashed = [
    ("UC-01\n搜尋二手書", "UC-02\n查看書籍詳細資料", "查到後查看"),
    ("UC-03\n送出或取消購買需求", "UC-05\n管理購買要求與\n面交安排", "需求進入賣方管理"),
    ("UC-05\n管理購買要求與\n面交安排", "UC-06\n查看交易狀態與\n信箱通知", "狀態與通知"),
    ("UC-08\n標記交易失敗與\n處理停權", "UC-06\n查看交易狀態與\n信箱通知", "通知交易結果"),
]

dashed_paths = [
    ([(790, 435), (875, 435), (875, 600), (820, 600)], "查到後查看", (860, 510)),
    ([(840, 768), (910, 768), (910, 640), (985, 640)], "需求進入賣方管理", (895, 700)),
    ([(1152, 705), (1152, 900), (1040, 930)], "狀態與通知", (1120, 850)),
    ([(1260, 1030), (1225, 1070), (1190, 1030)], "通知交易結果", (1225, 1090)),
]
dashed_paths = [
    ([shift_point(point) for point in points], note, shift_point(label_center))
    for points, note, label_center in dashed_paths
]

for points, note, label_center in dashed_paths:
    dashed_connector(draw, points)
    mx, my = label_center
    draw.rounded_rectangle((mx - 82, my - 16, mx + 82, my + 16), radius=8, fill="#ffffff", outline="#d3d8e3")
    center_text(draw, (mx - 82, my - 16, mx + 82, my + 16), note, small_font, fill="#586174", spacing=0)

for text, box in use_cases.items():
    draw.ellipse(box, fill="#eef4ff", outline="#4263eb", width=3)
    center_text(draw, box, text, uc_font)

draw.text((60, 1178), "來源：0720 actor_goal_matrix.md、use_case_inventory.md；圖檔：use_case_diagram.png；來源檔：use_case_diagram_source/use_case_diagram.mmd", font=small_font, fill="#697386")

img.save(OUT)
print(OUT)
