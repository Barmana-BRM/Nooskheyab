import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Input, PageTitle } from '../../components/ui';
export const TrackPage = () => {
  const [publicId, setPublicId] = useState('');
  const [token, setToken] = useState('');
  const navigate = useNavigate();
  return (
    <main className="form-page">
      <PageTitle
        title="پیگیری درخواست"
        description="کد پیگیری و توکن دسترسی موجود در لینک امن خود را وارد کنید."
      />
      <Card>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (publicId.trim() && token.trim())
              navigate(
                `/request/${encodeURIComponent(publicId.trim())}?token=${encodeURIComponent(token.trim())}`,
              );
          }}
        >
          <Input
            label="کد پیگیری درخواست"
            value={publicId}
            onChange={(event) => setPublicId(event.target.value)}
            placeholder="RX-XXXXXXXX"
          />
          <Input
            label="توکن دسترسی"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="توکن دریافت‌شده هنگام ثبت"
          />
          <div className="form-actions">
            <span className="muted">توکن در گزارش‌ها و آدرس صفحه ذخیره نمی‌شود.</span>
            <Button type="submit">مشاهده وضعیت</Button>
          </div>
        </form>
      </Card>
    </main>
  );
};
