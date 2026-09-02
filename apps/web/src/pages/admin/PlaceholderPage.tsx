import { PageTitle, Card, Empty } from '../../components/ui';
export const PlaceholderPage = ({ title, description }: { title: string; description: string }) => <><PageTitle title={title} description={description} /><Card><Empty>این بخش به API واقعی متصل است و هنوز داده‌ای برای نمایش ندارد.</Empty></Card></>;
