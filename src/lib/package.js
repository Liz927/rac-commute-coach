function formatMarks(marks, emptyText) {
  if (!marks.length) return emptyText

  return marks
    .map((mark, index) => {
      const note = mark.note?.trim() ? `\n   我的备注：${mark.note.trim()}` : ''
      return `${index + 1}. ${mark.targetLabel}：${mark.excerpt || '未填写摘要'}${note}`
    })
    .join('\n')
}

export function buildQuestionPackage(day) {
  const questionMarks = (day.marks || []).filter((mark) => mark.markType === 'question')
  const unsureMarks = (day.marks || []).filter((mark) => mark.markType === 'unsure')
  const wrongQuestions = (day.questions || []).filter(
    (question) =>
      question.userAnswer && question.correctAnswer && question.userAnswer !== question.correctAnswer,
  )
  const wrongText = wrongQuestions.length
    ? wrongQuestions
        .map(
          (question, index) =>
            `${index + 1}. ${question.label}\n   我的答案：${question.userAnswer}\n   正确答案：${question.correctAnswer}\n   题目：${question.question}\n   解释：${question.explanation || '暂无解释'}`,
        )
        .join('\n')
    : '无'

  return `RAC Day ${day.dayNumber} 回收问题：

今日学习主题：${day.title || '未命名主题'}

一、我标记为【想问】的内容

${formatMarks(questionMarks, '无')}

二、我标记为【不确定】的内容

${formatMarks(unsureMarks, '无')}

三、我答错的题

${wrongText}

四、我的自由备注

${day.notes?.trim() || '无'}`
}
