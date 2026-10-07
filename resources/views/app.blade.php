<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Booking Workspace</title>
    
    <!-- Injects Vite Dev Server Assets for React & Tailwind -->
    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/app.jsx'])
</head>
<body class="bg-slate-100 min-h-screen">
    <!-- This is where React will inject your UI components -->
    <div id="app"></div>
</body>
</html>
