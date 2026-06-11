#!/usr/bin/env perl
use strict;
use warnings;

my @files = @ARGV ? @ARGV : ('index.html', 'ru/index.html');

for my $file (@files) {
  open my $fh, '<', $file or die "Cannot read $file: $!";
  my $html = do { local $/; <$fh> };
  close $fh;

  # preconnect Umami
  unless ($html =~ /rel="preconnect" href="https:\/\/cloud\.umami\.is"/) {
    $html =~ s{
      (<link rel="preconnect" href="https://embed\.tawk\.to" crossorigin>)
    }{
      $1
      . "\n    <link rel=\"preconnect\" href=\"https://cloud.umami.is\" crossorigin>"
      . "\n    <link rel=\"dns-prefetch\" href=\"https://cloud.umami.is\">"
    }xe;
  }

  # version bump
  $html =~ s|href="/css/yoga\.css(\?v=\d+)?"|href="/css/yoga.css?v=5"|g;
  $html =~ s|src="/js/yoga\.js\?v=\d+"|src="/js/yoga.js?v=5"|g;
  $html =~ s|src="/js/yoga\.js"|src="/js/yoga.js?v=5"|g;

  # remove fetchpriority from room gallery images (keep hero)
  $html =~ s/(<img[^>]*\/img\/yoga_tour\/rooms_[^"]+\.png"[^>]*)\sfetchpriority="high"/$1/g;

  # wrap room PNG imgs in picture (skip if already patched)
  unless ($html =~ /<picture><source type="image\/webp" srcset="\/img\/yoga_tour\/rooms_/) {
    $html =~ s{
      <img\s+src="(/img/yoga_tour/rooms_[^"]+\.png)"([^>]*>)
    }{
      my ($path, $rest) = ($1, $2);
      my $webp = $path;
      $webp =~ s/\.png$/.webp/;
      "<picture><source type=\"image/webp\" srcset=\"$webp\"><img src=\"$path\"$rest</picture>"
    }gex;
  }

  # wrap logo in picture (skip if already patched)
  unless ($html =~ /<picture><source type="image\/webp" srcset="\/img\/satva-logo\.webp"/) {
    $html =~ s{
      <img\s+src="/img/satva-logo\.png"([^>]*>)
    }{
      "<picture><source type=\"image/webp\" srcset=\"/img/satva-logo.webp\"><img src=\"/img/satva-logo.png\"$1</picture>"
    }gex;
  }

  # beach_day responsive srcset
  unless ($html =~ /beach_day-800\.webp/) {
    $html =~ s{
      <picture>\s*
      <source type="image/webp" srcset="/img/yoga_tour/beach_day\.webp">\s*
      <img src="/img/yoga_tour/beach_day\.webp"\s*
      ([^>]*?)
      width="[^"]*"\s*
      height="[^"]*"\s*
      ([^>]*>)
    }{
      "<picture>\n                        <source type=\"image/webp\" srcset=\"/img/yoga_tour/beach_day-800.webp 800w, /img/yoga_tour/beach_day-1200.webp 1200w, /img/yoga_tour/beach_day-1600.webp 1600w\" sizes=\"(max-width: 767px) 100vw, 560px\">\n                        <img src=\"/img/yoga_tour/beach_day.webp\"\n                             $1width=\"1600\" height=\"1170\" $2"
    }gsx;
  }

  # Tawk.to отключён — убираем loader и preconnect
  $html =~ s{
    <!-- Tawk\.to[^>]*-->\s*
    <script[^>]*src="/js/tawk-deferred\.js[^"]*"[^>]*></script>\s*
  }{}gsx;
  $html =~ s{<link rel="preconnect" href="https://embed\.tawk\.to"[^>]*>\s*}{}g;

  open my $out, '>', $file or die "Cannot write $file: $!";
  print $out $html;
  close $out;
  print "Patched $file\n";
}
