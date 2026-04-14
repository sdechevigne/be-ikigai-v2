$images = @(
    "hero.png", "hero.avif", "hero.webp", "hero-bg.webp", "hero-bg-mobile.webp", 
    "favicon.ico", "logo_fullhd.png", "pl.avif", "pl.webp", "pl.jpg", 
    "pain.avif", "pain.webp", "pain.jpeg", "lumiere.avif", "lumiere.webp", "lumiere.jpeg", 
    "ikigai.avif", "ikigai.webp", "ikigai.png", "plante.webp"
)

$base_url = "https://be-ikigai.com/assets/img/"
$out_dir = "d:\Projets\be-ikigai\astro\public\assets\img"

if (Test-Path -Path $out_dir){}else{New-Item -ItemType Directory -Force -Path $out_dir}

foreach ($img in $images) {
    try {
        Invoke-WebRequest -Uri "$base_url$img" -OutFile "$out_dir\$img" -ErrorAction Stop
        Write-Host "Downloaded $img"
    } catch {
        Write-Host "Failed to download $($img) : $($_.Exception.Message)"
    }
}
