function ProfileInput({ value, onChange }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Profile của bạn</h2>
      </div>
      <textarea
        className="text-input"
        placeholder="Dán CV / mô tả kinh nghiệm, kỹ năng của bạn vào đây..."
        rows={10}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

export default ProfileInput
