<template>
  <div class="app">
    <header class="header">
      <div class="container header-inner">
        <div class="brand">
          <div class="brand-mark">✍</div>
          <div>
            <div class="brand-name">字帖生成器</div>
            <div class="brand-sub">输入文字 → 选择字格 → 一键打印（A4）</div>
          </div>
        </div>
        <div class="header-actions">
          <button class="btn ghost" @click="save">保存配置</button>
          <button class="btn primary" @click="print">打印 / 保存为 PDF</button>
        </div>
      </div>
    </header>

    <main class="container main">
      <div class="layout">
        <section class="panel">
          <h2 class="panel-title">📝 输入文字内容</h2>
          <p class="muted tiny">在此输入要生成字帖的文字，支持中文、英文、数字。换行会从下一行开始填充。</p>
          <textarea 
            v-model="text" 
            class="textarea-large" 
            rows="10" 
            placeholder="例如：静以修身，俭以养德。&#10;非淡泊无以明志，非宁静无以致远。&#10;&#10;或输入单个字重复练习，例如：永"
          ></textarea>

          <div class="panel-section">
            <h3 class="section-title">字体设置</h3>
            <div class="row cols-2">
              <label class="field">
                <span>字体</span>
                <select v-model="fontFamily">
                  <option v-for="f in fontOptions" :key="f.value" :value="f.value">{{ f.label }}</option>
                </select>
              </label>
              <label class="field">
                <span>字号（px）</span>
                <input v-model.number="fontSize" type="number" min="14" max="48" />
              </label>
            </div>
          </div>

          <div class="panel-section">
            <h3 class="section-title">字格设置</h3>
            <div class="row cols-2">
              <label class="field">
                <span>字格样式</span>
                <select v-model="gridType">
                  <option value="mi">米字格</option>
                  <option value="tian">田字格</option>
                  <option value="square">方格</option>
                  <option value="blank">空白（仅边框）</option>
                </select>
              </label>
              <label class="field">
                <span>描红透明度</span>
                <input v-model.number="ghostOpacity" type="number" min="0" max="0.9" step="0.05" />
              </label>
            </div>
          </div>

          <div class="panel-section">
            <h3 class="section-title">页面设置</h3>
            <div class="row cols-3">
              <label class="field">
                <span>每页列数</span>
                <input v-model.number="cols" type="number" min="6" max="20" />
              </label>
              <label class="field">
                <span>每页行数</span>
                <input v-model.number="rows" type="number" min="6" max="28" />
              </label>
              <label class="field">
                <span>每字重复</span>
                <input v-model.number="repeatEach" type="number" min="1" max="10" />
              </label>
            </div>
            <div class="row cols-1">
              <label class="field">
                <span>标题（可选）</span>
                <input v-model="title" type="text" placeholder="例如：一年级上·生字练习" />
              </label>
            </div>
            <div class="row cols-1">
              <label class="field">
                <span>去空格</span>
                <select v-model="removeSpaces">
                  <option :value="false">否（保留空格）</option>
                  <option :value="true">是（去除空格）</option>
                </select>
              </label>
            </div>
          </div>

          <div class="actions">
            
            <button class="btn primary" @click="downloadPdf">导出 PDF</button>
          </div>

          <div class="hint">
            <p class="muted tiny">
              💡 提示：在打印对话框中选择 A4，关闭页眉页脚，边距选“默认/无”，即可得到干净的字帖。
            </p>
          </div>
        </section>

        <section class="preview">
          <div class="preview-head">
            <h2>预览</h2>
            <div class="muted tiny">共 {{ pageCount }} 页 · {{ totalChars }} 字符（不含空格）</div>
          </div>

          <div class="pages">
            <article v-for="(p, idx) in pages" :key="idx" class="page">
              <div class="page-title" v-if="title">
                <div class="page-title-left">{{ title }}</div>
                <div class="page-title-right">第 {{ idx + 1 }} / {{ pageCount }} 页</div>
              </div>

              <div
                class="grid"
                :style="{
                  gridTemplateColumns: `repeat(${cols}, 1fr)`,
                  gridTemplateRows: `repeat(${rows}, 1fr)`,
                }"
              >
                <div
                  v-for="(ch, i) in p"
                  :key="i"
                  class="cell"
                  :class="[gridType, cellClass(i)]"
                >
                  <div class="cell-inner" :style="{ fontSize: `${fontSize}px`, fontFamily }">
                    <div class="ghost" :style="{ opacity: ghostOpacity }">{{ ch }}</div>
                    <div class="solid">{{ ch }}</div>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </section>
      </div>
    </main>

    <footer class="footer">
      <div class="container footer-inner">
        <div>字帖生成器 · 本地生成与打印</div>
        <div class="muted tiny">本项目由阿里云ESA提供加速、计算和保护</div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { expandChars, fillGrid, paginate, splitChars } from './utils/copybook'
import html2pdf from 'html2pdf.js'

const text = ref('')
const title = ref('')
const gridType = ref('mi')
const cols = ref(12)
const rows = ref(14)
const fontSize = ref(28)
const ghostOpacity = ref(0.18)
const repeatEach = ref(1)
const removeSpaces = ref(false)

const fontOptions = [
  { label: '楷体（推荐练字）', value: 'KaiTi, Kaiti SC, STKaiti, serif' },
  { label: '宋体', value: 'SimSun, Songti SC, STSong, serif' },
  { label: '黑体', value: 'SimHei, Heiti SC, STHeiti, sans-serif' },
  { label: '仿宋', value: 'FangSong, STFangsong, serif' },
  { label: '微软雅黑', value: 'Microsoft YaHei, sans-serif' },
  { label: '系统默认', value: 'system-ui, -apple-system, PingFang SC, Microsoft YaHei, sans-serif' },
]
const fontFamily = ref(fontOptions[0].value)

const totalChars = computed(() => splitChars(text.value).filter((c) => c !== ' ' && c !== '\n').length)

const pages = computed(() => {
  const c = Math.max(1, Number(cols.value) || 12)
  const r = Math.max(1, Number(rows.value) || 14)
  const raw = splitChars(text.value)
  const expanded = expandChars(raw, repeatEach.value, { removeSpaces: removeSpaces.value })
  const paged = paginate(expanded, c, r)
  return paged.map((p) => fillGrid(p, c, r))
})

const pageCount = computed(() => pages.value.length || 1)

function fillSample() {
  title.value = '示例·楷书练习'
  text.value = '静以修身，俭以养德。\n非淡泊无以明志，非宁静无以致远。\n\n每日临摹 10 分钟。'
}

function clearText() {
  text.value = ''
}

function save() {
  const payload = {
    text: text.value,
    title: title.value,
    gridType: gridType.value,
    cols: cols.value,
    rows: rows.value,
    fontSize: fontSize.value,
    ghostOpacity: ghostOpacity.value,
    repeatEach: repeatEach.value,
    removeSpaces: removeSpaces.value,
    fontFamily: fontFamily.value,
  }
  localStorage.setItem('copybook_gen_v1', JSON.stringify(payload))
  // eslint-disable-next-line no-alert
  alert('已保存到本地')
}

function load() {
  const raw = localStorage.getItem('copybook_gen_v1')
  if (!raw) return
  try {
    const p = JSON.parse(raw)
    text.value = p.text ?? text.value
    title.value = p.title ?? title.value
    gridType.value = p.gridType ?? gridType.value
    cols.value = p.cols ?? cols.value
    rows.value = p.rows ?? rows.value
    fontSize.value = p.fontSize ?? fontSize.value
    ghostOpacity.value = p.ghostOpacity ?? ghostOpacity.value
    repeatEach.value = p.repeatEach ?? repeatEach.value
    removeSpaces.value = p.removeSpaces ?? removeSpaces.value
    fontFamily.value = p.fontFamily ?? fontFamily.value
  } catch {
    // ignore
  }
}

function print() {
  window.print()
}

function downloadHtml() {
  const html = document.documentElement.outerHTML
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'copybook.html'
  a.click()
  URL.revokeObjectURL(url)
}

async function downloadPdf() {
  const previewSection = document.querySelector('.preview')
  if (!previewSection) {
    alert('预览区域未找到')
    return
  }

  const fileName = title.value ? `${title.value}.pdf` : '字帖.pdf'

  const opt = {
    margin: [3, 3, 3, 3],
    filename: fileName,
    image: { type: 'jpeg', quality: 0.75 },
    html2canvas: { 
      scale: 1.2,
      useCORS: true,
      logging: false
    },
    jsPDF: { 
      unit: 'mm', 
      format: 'a4', 
      orientation: 'portrait' 
    },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
  }

  try {
    await html2pdf().set(opt).from(previewSection).save()
  } catch (error) {
    console.error('PDF导出失败:', error)
    alert('PDF导出失败，请重试')
  }
}

function cellClass(i) {
  const c = Math.max(1, Number(cols.value) || 12)
  const r = Math.max(1, Number(rows.value) || 14)
  const col = (i + 1) % c
  const row = Math.ceil((i + 1) / c)
  return {
    'last-col': col === 0,
    'last-row': row === r,
  }
}


watch([text, title, gridType, cols, rows, fontSize, ghostOpacity], () => {
  // 轻量自动保存：避免刷新丢失
  const payload = {
    text: text.value,
    title: title.value,
    gridType: gridType.value,
    cols: cols.value,
    rows: rows.value,
    fontSize: fontSize.value,
    ghostOpacity: ghostOpacity.value,
    repeatEach: repeatEach.value,
    removeSpaces: removeSpaces.value,
    fontFamily: fontFamily.value,
  }
  localStorage.setItem('copybook_gen_autosave_v1', JSON.stringify(payload))
})

onMounted(() => {
  load()
  const raw = localStorage.getItem('copybook_gen_autosave_v1')
  if (raw && !text.value) {
    try {
      const p = JSON.parse(raw)
      text.value = p.text ?? ''
      title.value = p.title ?? ''
      gridType.value = p.gridType ?? gridType.value
      cols.value = p.cols ?? cols.value
      rows.value = p.rows ?? rows.value
      fontSize.value = p.fontSize ?? fontSize.value
      ghostOpacity.value = p.ghostOpacity ?? ghostOpacity.value
      repeatEach.value = p.repeatEach ?? repeatEach.value
      removeSpaces.value = p.removeSpaces ?? removeSpaces.value
      fontFamily.value = p.fontFamily ?? fontFamily.value
    } catch {
      // ignore
    }
  }
  if (!text.value) fillSample()
})
</script>
