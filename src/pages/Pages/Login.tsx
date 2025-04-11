import React, { useState, useEffect } from "react";
import logodark from "../../assets/images/logo-dark.svg";
import { Link } from "react-router-dom";
import { Card, CardBody, Col, Row, Alert } from "react-bootstrap";
import { 
  login as loginApi, 
  isAuthenticated, 
  TOKEN_KEY,
  getLoginBackgroundUrl
} from "../../services/api";

const Login: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState<string>("");
  const [backgroundLoading, setBackgroundLoading] = useState(true);

  // Проверяем, авторизован ли пользователь при загрузке компонента
  useEffect(() => {
    if (isAuthenticated()) {
      window.location.href = "/dashboard";
    }
  }, []);

  // Загружаем фоновое изображение из API
  useEffect(() => {
    const loadBackgroundImage = async () => {
      setBackgroundLoading(true);
      try {
        console.log("Начинаем загрузку фона...");
        const imageUrl = await getLoginBackgroundUrl();
        console.log("Получен URL фона:", imageUrl);
        
        if (imageUrl) {
          setBackgroundImage(imageUrl);
          console.log("Фоновое изображение установлено:", imageUrl);
        } else {
          console.log("API вернул пустой URL для фона. Будет использован цвет по умолчанию.");
        }
      } catch (error) {
        console.error("Не удалось загрузить фон страницы входа:", error);
      } finally {
        setBackgroundLoading(false);
      }
    };
    
    loadBackgroundImage();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Используем функцию login из api.ts
      const response = await loginApi(username, password);
      
      // После успешного входа принудительно устанавливаем токен
      localStorage.setItem(TOKEN_KEY, response.token);
      
      // Показываем сообщение об успешном входе
      setRedirecting(true);
      
      // Используем setTimeout для корректного обновления localStorage
      setTimeout(() => {
        // Явно направляем пользователя на дашборд
        window.location.href = "/dashboard";
      }, 500);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Произошла неизвестная ошибка");
      }
      setLoading(false);
    }
  };

  return (
    <React.Fragment>
      <div
        className="auth-main v2"
        style={backgroundImage ? {
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          minHeight: "100vh"
        } : {
          // Простой светлый фон если изображение не найдено
          backgroundColor: "#f8f9fa",
          minHeight: "100vh"
        }}
      >
        <div className="bg-overlay bg-dark-custom"></div>
        <div className="auth-wrapper">
          <div className="auth-sidecontent">
            <div className="auth-sidefooter">
              <img src={logodark} className="img-brand img-fluid" alt="Логотип" />
              <hr className="mb-3 mt-4" />
              <Row>
                <Col className="my-1">
                  <p className="m-0">Система управления региональной информационной системой</p>
                </Col>
                <div className="col-auto my-1">
                  <ul className="list-inline footer-link mb-0">
                    <li className="list-inline-item">
                      <Link to="/">Главная</Link>
                    </li>
                    <li className="list-inline-item">
                      <Link to="#">Документация</Link>
                    </li>
                    <li className="list-inline-item">
                      <Link to="#">Поддержка</Link>
                    </li>
                  </ul>
                </div>
              </Row>
            </div>
          </div>
          <div className="auth-form">
            <Card className="my-5 mx-3">
              <CardBody>
                <h4 className="f-w-500 mb-1">Вход в систему</h4>
                <p className="mb-3">Введите свои данные для доступа</p>

                {error && (
                  <Alert variant="danger" className="mb-3">
                    {error}
                  </Alert>
                )}

                {redirecting ? (
                  <Alert variant="success" className="mb-3">
                    Вход выполнен успешно! Перенаправление...
                  </Alert>
                ) : (
                  <form onSubmit={handleLogin}>
                    <div className="mb-3">
                      <input
                        type="text"
                        className="form-control"
                        id="loginInput"
                        placeholder="Логин"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <input
                        type="password"
                        className="form-control"
                        id="passwordInput"
                        placeholder="Пароль"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div className="d-flex mt-1 justify-content-between align-items-center">
                      <div className="form-check">
                        <input
                          className="form-check-input input-primary"
                          type="checkbox"
                          id="rememberMeCheck"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                        />
                        <label
                          className="form-check-label text-muted"
                          htmlFor="rememberMeCheck"
                        >
                          Запомнить меня
                        </label>
                      </div>
                      <Link to="/pages/forgot-password-v2">
                        <h6 className="text-secondary f-w-400 mb-0">
                          Забыли пароль?
                        </h6>
                      </Link>
                    </div>
                    <div className="d-grid mt-4">
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading}
                      >
                        {loading ? "Выполняется вход..." : "Войти"}
                      </button>
                    </div>
                    <div className="saprator my-3">
                      <span>Или войти через</span>
                    </div>
                    <div className="text-center">
                      <ul className="list-inline mx-auto mt-3 mb-0">
                        <li className="list-inline-item">
                          <Link to="#" className="avtar avtar-s rounded-circle bg-facebook">
                            <i className="fab fa-facebook-f text-white"></i>
                          </Link>
                        </li>
                        <li className="list-inline-item">
                          <Link to="#" className="avtar avtar-s rounded-circle bg-twitter">
                            <i className="fab fa-twitter text-white"></i>
                          </Link>
                        </li>
                        <li className="list-inline-item">
                          <Link to="#" className="avtar avtar-s rounded-circle bg-googleplus">
                            <i className="fab fa-google text-white"></i>
                          </Link>
                        </li>
                      </ul>
                    </div>
                  </form>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
};

export default Login;