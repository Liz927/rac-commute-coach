import { ArrowUpFromLine, FilePlus2 } from 'lucide-react'

export default function AddScreen({ onNewDay, onImportPackage }) {
  return (
    <main className="screen add-screen">
      <header className="page-title">
        <p className="eyebrow">ADD CONTENT</p>
        <h1>添加学习内容</h1>
        <p>每天最省力的方式：复制 GPT 生成的学习包，一次导入正文和 Quiz 题目。</p>
      </header>

      <section className="add-action-grid">
        <button type="button" onClick={onImportPackage}>
          <ArrowUpFromLine size={24} />
          <span>
            <strong>导入学习包</strong>
            <small>推荐粘贴 RAC_DAY_PACKAGE_V2_START，避免手机复制时短横线丢失</small>
          </span>
        </button>
        <button type="button" onClick={onNewDay}>
          <FilePlus2 size={24} />
          <span>
            <strong>新增空白 Day</strong>
            <small>手动填写正文和题目，适合临时补丁内容</small>
          </span>
        </button>
      </section>
    </main>
  )
}
