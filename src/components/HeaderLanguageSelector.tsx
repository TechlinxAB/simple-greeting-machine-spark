
import LanguageSelector from "@/components/LanguageSelector";

export const HeaderLanguageSelector = () => {
  return (
    <div className="ml-2">
      <LanguageSelector variant="ghost" size="sm" showLabel={false} />
    </div>
  );
};

export default HeaderLanguageSelector;
