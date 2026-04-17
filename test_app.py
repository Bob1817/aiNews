from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    # 启动浏览器
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    
    # 访问应用
    page.goto('http://localhost:5173')
    page.wait_for_load_state('networkidle')
    
    # 截图登录页面
    page.screenshot(path='test_screenshots/login_page.png', full_page=True)
    print('✅ 登录页面截图已保存')
    
    # 检查页面标题
    title = page.title()
    print(f'✅ 页面标题: {title}')
    
    # 检查登录页面元素
    try:
        if page.locator('input[type="email"]').is_visible():
            print('✅ 邮箱输入框可见')
        if page.locator('input[type="password"]').is_visible():
            print('✅ 密码输入框可见')
        if page.locator('button:has-text("登录")').is_visible():
            print('✅ 登录按钮可见')
        if page.locator('a:has-text("注册")').is_visible():
            print('✅ 注册链接可见')
    except Exception as e:
        print(f'⚠️  登录页面元素检查失败: {e}')
    
    # 测试注册页面
    try:
        page.locator('a:has-text("注册")').click()
        page.wait_for_load_state('networkidle')
        page.screenshot(path='test_screenshots/register_page.png', full_page=True)
        print('✅ 注册页面截图已保存')
        
        # 检查注册页面元素
        if page.locator('input[type="email"]').is_visible():
            print('✅ 注册页面邮箱输入框可见')
        if page.locator('input[type="password"]').is_visible():
            print('✅ 注册页面密码输入框可见')
        if page.locator('button:has-text("注册")').is_visible():
            print('✅ 注册按钮可见')
    except Exception as e:
        print(f'⚠️  注册页面测试失败: {e}')
    
    # 回到登录页面
    try:
        page.goto('http://localhost:5173/login')
        page.wait_for_load_state('networkidle')
    except Exception as e:
        print(f'⚠️  回到登录页面失败: {e}')
    
    # 测试登录功能（使用模拟数据）
    try:
        page.locator('input[type="email"]').fill('test@example.com')
        page.locator('input[type="password"]').fill('password123')
        page.screenshot(path='test_screenshots/login_form_filled.png', full_page=True)
        print('✅ 登录表单填写截图已保存')
        
        # 点击登录按钮
        page.locator('button:has-text("登录")').click()
        page.wait_for_load_state('networkidle')
        
        # 检查是否登录成功（是否显示导航栏）
        if page.locator('aside').is_visible():
            print('✅ 登录成功，侧边栏可见')
            page.screenshot(path='test_screenshots/logged_in.png', full_page=True)
            print('✅ 登录后页面截图已保存')
            
            # 测试导航到不同页面
            pages_to_test = [
                ('聊天', 'chat'),
                ('新闻', 'news_list'),
                ('设置', 'settings'),
                ('配置', 'config')
            ]
            
            for page_name, screenshot_name in pages_to_test:
                try:
                    # 查找并点击导航链接
                    nav_link = page.locator(f'aside a:has-text("{page_name}")')
                    if nav_link.is_visible():
                        nav_link.click()
                        page.wait_for_load_state('networkidle')
                        page.screenshot(path=f'test_screenshots/{screenshot_name}.png', full_page=True)
                        print(f'✅ {page_name}页面截图已保存')
                    else:
                        print(f'⚠️  {page_name}链接不可见')
                except Exception as e:
                    print(f'⚠️  导航到{page_name}页面失败: {e}')
        else:
            print('⚠️  登录失败，未显示侧边栏')
            page.screenshot(path='test_screenshots/login_failed.png', full_page=True)
            print('✅ 登录失败页面截图已保存')
    except Exception as e:
        print(f'⚠️  登录测试失败: {e}')
    
    # 关闭浏览器
    browser.close()
    print('✅ 测试完成')
