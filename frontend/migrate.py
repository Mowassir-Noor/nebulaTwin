import os
import re

src_dir = '/tmp/twin-architect/src/routes'
dest_dir = 'src/pages/marketing'
layout_src = '/tmp/twin-architect/src/components/layout/MarketingLayout.tsx'
layout_dest = 'src/components/layout/MarketingLayout.tsx'

os.makedirs(dest_dir, exist_ok=True)
os.makedirs(os.path.dirname(layout_dest), exist_ok=True)

def convert_file(src, dest, component_name):
    with open(src, 'r') as f:
        content = f.read()

    # Replace @tanstack/react-router imports with react-router-dom
    content = re.sub(r'import\s+\{[^}]*\}\s+from\s+["\']@tanstack/react-router["\'];?', 'import { Link } from "react-router-dom";', content)

    # Remove `export const Route = createFileRoute...` block entirely
    content = re.sub(r'export const Route = createFileRoute\([^)]+\)\(\{[^}]*component:[^,}]*[^}]*\}\);?', '', content, flags=re.DOTALL)
    
    # Check if there are other usages of `createFileRoute` we missed, just in case
    # Convert `function ComponentName` to `export default function ComponentName`
    if 'export default' not in content:
        content = re.sub(r'function\s+' + component_name + r'\s*\(', f'export default function {component_name}(', content)

    with open(dest, 'w') as f:
        f.write(content.strip() + '\n')

files = [
    ('_marketing.about.tsx', 'AboutPage.tsx', 'About'),
    ('_marketing.contact.tsx', 'ContactPage.tsx', 'Contact'),
    ('_marketing.features.tsx', 'FeaturesPage.tsx', 'Features'),
    ('_marketing.index.tsx', 'LandingPage.tsx', 'Landing'),
    ('_marketing.pricing.tsx', 'PricingPage.tsx', 'Pricing'),
]

for src_name, dest_name, comp_name in files:
    src_path = os.path.join(src_dir, src_name)
    dest_path = os.path.join(dest_dir, dest_name)
    convert_file(src_path, dest_path, comp_name)
    print(f"Migrated {src_name} to {dest_name}")

# Now handle MarketingLayout.tsx
with open(layout_src, 'r') as f:
    layout_content = f.read()

layout_content = re.sub(
    r'import\s+\{\s*Link,\s*Outlet,\s*useRouterState\s*\}\s+from\s+["\']@tanstack/react-router["\'];?',
    'import { Link, Outlet, useLocation } from "react-router-dom";',
    layout_content
)
layout_content = layout_content.replace(
    'const path = useRouterState({ select: (s) => s.location.pathname });',
    'const location = useLocation();\n  const path = location.pathname;'
)
# Ensure we make MarketingLayout the default export, wait it's `export function MarketingLayout` which is fine.

with open(layout_dest, 'w') as f:
    f.write(layout_content)
print("Migrated MarketingLayout.tsx")

