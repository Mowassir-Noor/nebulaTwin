import os

dest_dir = 'src/pages/marketing'
pages = ['AboutPage.tsx', 'ContactPage.tsx', 'FeaturesPage.tsx', 'LandingPage.tsx', 'PricingPage.tsx']

for p in pages:
    path = os.path.join(dest_dir, p)
    with open(path, 'r') as f:
        lines = f.readlines()
    
    new_lines = []
    skip = False
    for line in lines:
        if 'export const Route = createFileRoute' in line:
            skip = True
        if skip and '});' in line:
            skip = False
            continue
        if not skip:
            new_lines.append(line)
            
    with open(path, 'w') as f:
        f.writelines(new_lines)

# Also fix the Github/Twitter import
layout_path = 'src/components/layout/MarketingLayout.tsx'
with open(layout_path, 'r') as f:
    l_content = f.read()
l_content = l_content.replace('Github, Twitter', 'GithubIcon, TwitterIcon')
l_content = l_content.replace('<Github', '<GithubIcon')
l_content = l_content.replace('<Twitter', '<TwitterIcon')
with open(layout_path, 'w') as f:
    f.write(l_content)
