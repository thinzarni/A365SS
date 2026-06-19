const fs = require('fs');
const content = fs.readFileSync('d:/FlutterProjects/A365_Mobile_And_Web/A365SS/src/pages/NewRequestPage/NewRequestPage.tsx', 'utf-8');

let lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('<Input ') && lines[i].includes('type="date"')) {
        lines[i] = lines[i].replace('<Input ', '<DateInput ');
        lines[i] = lines[i].replace(' type="date"', ''); 
    }
}

const injection = `const DateInput = ({ id, label, value, onChange, readOnly, error, required }: any) => {
    const [focused, setFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const formatDisplayDate = (d: string) => {
        if (!d) return '';
        const p = d.split('-');
        if (p.length === 3) return \`\${p[2]}/\${p[1]}/\${p[0]}\`;
        return d;
    };
    return (
        <Input
            ref={inputRef}
            id={id}
            label={label}
            type={readOnly ? "text" : (focused ? "date" : "text")}
            value={readOnly || !focused ? formatDisplayDate(value) : value}
            onChange={onChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onClick={() => {
                if (!readOnly && inputRef.current) {
                    try { inputRef.current.showPicker(); } catch (e) {}
                }
            }}
            readOnly={readOnly}
            placeholder="dd/MM/yyyy"
            error={error}
            required={required}
        />
    );
};
`;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('export default function NewRequestPage() {')) {
        lines.splice(i, 0, injection);
        break;
    }
}

fs.writeFileSync('d:/FlutterProjects/A365_Mobile_And_Web/A365SS/src/pages/NewRequestPage/NewRequestPage.tsx', lines.join('\n'), 'utf-8');
